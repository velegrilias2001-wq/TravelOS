import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Screen } from '@/components/ui/screen';
import { UtilityScreenHeader } from '@/components/ui/utility-screen';
import { DnaReflectionCards } from '@/features/copilot/dna-reflection-cards';
import type { TravelDNA } from '@/domain/entities';
import { getGroundedDiscoverCandidates } from '@/services/discover-catalogue-candidates';
import {
  buildDiscoverTripPrefill,
  serializeDiscoverTripPrefill,
} from '@/services/discover-trip-handoff';
import {
  applyDnaReflectionProposal,
  selectDnaReflectionProposals,
  type DnaReflectionProposal,
} from '@/services/dna-reflection';
import { sendTravelChatTurn } from '@/services/travel-chat-service';
import { travelDNAService } from '@/services/travel-dna-runtime';
import { useDiscoverStore } from '@/store/discover-store';
import {
  useTravelChatStore,
  type TravelChatDestinationCard,
} from '@/store/travel-chat-store';
import {
  colors,
  fontFamily,
  fontSize,
  lineHeight,
  radius,
  shadows,
  spacing,
} from '@/theme';

export default function TravelChatScreen() {
  const router = useRouter();
  const brief = useDiscoverStore((state) => state.brief);
  const messages = useTravelChatStore(
    (state) => state.messages,
  );
  const appendMessage = useTravelChatStore(
    (state) => state.appendMessage,
  );
  const clearChat = useTravelChatStore(
    (state) => state.clear,
  );

  const [draft, setDraft] = useState('');
  const [travelDNA, setTravelDNA] =
    useState<TravelDNA | null>(null);
  const [busy, setBusy] = useState(false);
  const [dnaBusyId, setDnaBusyId] = useState<string | null>(
    null,
  );
  const [dismissedDnaIds, setDismissedDnaIds] = useState<
    string[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const profile = await travelDNAService.get();
        if (!cancelled) {
          setTravelDNA(profile);
        }
      } catch {
        if (!cancelled) {
          setTravelDNA(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const dnaProposals = useMemo(
    () =>
      selectDnaReflectionProposals({
        travelDNA,
        brief,
      }).filter(
        (proposal) => !dismissedDnaIds.includes(proposal.id),
      ),
    [travelDNA, brief, dismissedDnaIds],
  );

  const send = async () => {
    const content = draft.trim();

    if (!content || busy) {
      return;
    }

    const userMessage = {
      id: Crypto.randomUUID(),
      role: 'user' as const,
      content,
    };

    appendMessage(userMessage);
    setDraft('');
    setBusy(true);
    setError(null);

    try {
      const history = [
        ...messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        {
          role: 'user' as const,
          content,
        },
      ];

      const turn = await sendTravelChatTurn({
        messages: history,
        brief,
        travelDNA,
      });

      appendMessage({
        id: Crypto.randomUUID(),
        role: 'assistant',
        content: turn.reply,
        cards: turn.cards,
        provider: turn.provider,
        model: turn.model,
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message === 'embeddings_unavailable' ||
            caught.message === 'ai_disabled' ||
            caught.message === 'ai_disabled_by_traveler' ||
            caught.message === 'ai_provider_unavailable'
            ? 'Το Travel Chat χρειάζεται ενεργό TravelOS AI (Profile → TravelOS AI).'
            : caught.message
          : 'Το Travel Chat δεν μπόρεσε να απαντήσει.',
      );
    } finally {
      setBusy(false);
    }
  };

  const confirmCard = (card: TravelChatDestinationCard) => {
    const candidate = getGroundedDiscoverCandidates().find(
      (item) => item.id === card.identity,
    );

    if (!candidate) {
      setError('Αυτός ο προορισμός δεν είναι πλέον στον κατάλογο.');
      return;
    }

    const prefill = buildDiscoverTripPrefill(
      brief ?? {
        mode: 'find_destination',
        interests: [],
      },
      candidate.destination,
    );

    router.push({
      pathname: '/new-trip',
      params: serializeDiscoverTripPrefill(prefill),
    });
  };

  const acceptDnaProposal = async (
    proposal: DnaReflectionProposal,
  ) => {
    if (dnaBusyId) {
      return;
    }

    setDnaBusyId(proposal.id);

    try {
      const next = applyDnaReflectionProposal(travelDNA, proposal);
      const saved = await travelDNAService.save(next);
      setTravelDNA(saved);
      setDismissedDnaIds((current) => [...current, proposal.id]);
    } catch (caught) {
      Alert.alert(
        'Δεν αποθηκεύτηκε',
        caught instanceof Error
          ? caught.message
          : 'Δοκίμασε ξανά.',
      );
    } finally {
      setDnaBusyId(null);
    }
  };

  return (
    <Screen scroll>
      <UtilityScreenHeader
        eyebrow="TRAVEL CHAT"
        title="Ρώτα το TravelOS"
        subtitle="Μόνο grounded ιδέες. Το Confirm ανοίγει Create Trip — τίποτα δεν γράφεται πριν το αποθηκεύσεις."
        leading={(
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Πίσω"
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back"
              size={21}
              color={colors.textPrimary}
            />
          </Pressable>
        )}
        action={(
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Καθαρισμός συνομιλίας"
            style={styles.clearButton}
            onPress={clearChat}
          >
            <Text style={styles.clearLabel}>Καθαρισμός</Text>
          </Pressable>
        )}
      />

      <View style={styles.thread}>
        {messages.length === 0 ? (
          <Text style={styles.empty}>
            Πες τι ταξίδι ψάχνεις. Οι κάρτες βγαίνουν μόνο από
            τον grounded κατάλογο — χωρίς εφευρεμένες πόλεις.
          </Text>
        ) : null}

        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.bubble,
              message.role === 'user'
                ? styles.userBubble
                : styles.assistantBubble,
            ]}
          >
            <Text
              style={
                message.role === 'user'
                  ? styles.userText
                  : styles.assistantText
              }
            >
              {message.content}
            </Text>

            {message.provider && message.model ? (
              <Text style={styles.provenance}>
                {message.provider} · {message.model}
              </Text>
            ) : null}

            {message.cards?.map((card) => (
              <View key={card.identity} style={styles.card}>
                <View style={styles.cardCopy}>
                  <Text style={styles.cardTitle}>
                    {card.name}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {card.countryCode
                      ? `${card.countryCode} · catalogue`
                      : 'catalogue'}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Επιβεβαίωση ${card.name} για Create Trip`}
                  style={styles.confirmButton}
                  onPress={() => confirmCard(card)}
                >
                  <Text style={styles.confirmLabel}>
                    Επιβεβαίωση
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        ))}
      </View>

      <DnaReflectionCards
        proposals={dnaProposals}
        busyId={dnaBusyId}
        onAccept={(proposal) => {
          void acceptDnaProposal(proposal);
        }}
        onDismiss={(proposal) => {
          setDismissedDnaIds((current) => [
            ...current,
            proposal.id,
          ]);
        }}
      />

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : null}

      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Περίγραψε το ταξίδι που θέλεις…"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          multiline
          editable={!busy}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Αποστολή"
          disabled={busy || draft.trim().length === 0}
          style={[
            styles.sendButton,
            (busy || draft.trim().length === 0) &&
              styles.sendDisabled,
          ]}
          onPress={() => {
            void send();
          }}
        >
          {busy ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <Ionicons
              name="send"
              size={18}
              color={colors.textInverse}
            />
          )}
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    ...shadows.subtle,
  },
  clearButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  clearLabel: {
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  thread: {
    gap: spacing[3],
    marginTop: spacing[4],
    marginBottom: spacing[4],
  },
  empty: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodySmall,
    color: colors.textMuted,
  },
  bubble: {
    padding: spacing[3],
    borderRadius: radius.lg,
    gap: spacing[2],
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.brand,
    maxWidth: '88%',
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    maxWidth: '92%',
    ...shadows.subtle,
  },
  userText: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.body,
    color: colors.textInverse,
  },
  assistantText: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.body,
    color: colors.textPrimary,
  },
  provenance: {
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.micro,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.backgroundSoft,
  },
  cardCopy: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.body,
    color: colors.textPrimary,
  },
  cardMeta: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  confirmButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.md,
    backgroundColor: colors.teal,
  },
  confirmLabel: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.caption,
    color: colors.textInverse,
  },
  error: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    color: colors.coral,
    marginBottom: spacing[3],
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing[2],
    marginBottom: spacing[8],
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.body,
    color: colors.textPrimary,
    ...shadows.subtle,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand,
  },
  sendDisabled: {
    opacity: 0.4,
  },
});
