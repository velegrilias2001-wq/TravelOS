import { Ionicons } from '@expo/vector-icons';
import {
  router,
  useFocusEffect,
} from 'expo-router';
import {
  useCallback,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { InlineError } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import {
  UtilityScreenHeader,
} from '@/components/ui/utility-screen';
import { DnaReflectionCards } from '@/features/copilot/dna-reflection-cards';
import type {
  BudgetStyle,
  DailyRhythm,
  TravelDNA,
  TravelInterest,
  TravelPace,
  TravelStyle,
  TypicalTravelParty,
} from '@/domain/entities';
import {
  applyDnaReflectionProposal,
  selectDnaReflectionProposals,
  type DnaReflectionProposal,
} from '@/services/dna-reflection';
import {
  travelDNAService,
} from '@/services/travel-dna-runtime';
import { useDiscoverStore } from '@/store/discover-store';
import { useTripStore } from '@/store/trip-store';
import {
  colors,
  fontFamily,
  fontSize,
  lineHeight,
  radius,
  spacing,
} from '@/theme';

type LoadStatus =
  | 'loading'
  | 'ready'
  | 'error';

const PACE_OPTIONS: Array<{
  value: TravelPace;
  label: string;
  description: string;
}> = [
  {
    value: 'slow',
    label: 'Slow',
    description: 'More breathing room',
  },
  {
    value: 'balanced',
    label: 'Balanced',
    description: 'A considered mix',
  },
  {
    value: 'full',
    label: 'Full',
    description: 'Make the most of each day',
  },
];

const INTEREST_OPTIONS: Array<{
  value: TravelInterest;
  label: string;
}> = [
  { value: 'food', label: 'Food' },
  { value: 'culture', label: 'Culture' },
  { value: 'nature', label: 'Nature' },
  { value: 'beaches', label: 'Beaches' },
  { value: 'nightlife', label: 'Nightlife' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'wellness', label: 'Wellness' },
  { value: 'adventure', label: 'Adventure' },
];

const STYLE_OPTIONS: Array<{
  value: TravelStyle;
  label: string;
  description: string;
}> = [
  {
    value: 'local',
    label: 'Local',
    description: 'Neighbourhoods and local life',
  },
  {
    value: 'iconic',
    label: 'Iconic',
    description: 'The essential highlights',
  },
  {
    value: 'mix',
    label: 'Mix',
    description: 'A bit of both',
  },
];

const BUDGET_OPTIONS: Array<{
  value: BudgetStyle;
  label: string;
  description: string;
}> = [
  {
    value: 'value',
    label: 'Value',
    description: 'Spend thoughtfully',
  },
  {
    value: 'comfortable',
    label: 'Comfortable',
    description: 'Balance value and comfort',
  },
  {
    value: 'premium',
    label: 'Premium',
    description: 'Prioritise the experience',
  },
];

const RHYTHM_OPTIONS: Array<{
  value: DailyRhythm;
  label: string;
  description: string;
}> = [
  {
    value: 'morning',
    label: 'Morning',
    description: 'Start earlier',
  },
  {
    value: 'flexible',
    label: 'Flexible',
    description: 'Let the day flow',
  },
  {
    value: 'night',
    label: 'Night',
    description: 'Later starts, later finishes',
  },
];

const PARTY_OPTIONS: Array<{
  value: TypicalTravelParty;
  label: string;
}> = [
  { value: 'solo', label: 'Solo' },
  { value: 'couple', label: 'Couple' },
  { value: 'friends', label: 'Friends' },
  { value: 'family', label: 'Family' },
];

export default function TravelDNAScreen() {
  const brief = useDiscoverStore((state) => state.brief);
  const trips = useTripStore((state) => state.trips);
  const [status, setStatus] =
    useState<LoadStatus>('loading');
  const [isSaving, setIsSaving] =
    useState(false);
  const [dnaBusyId, setDnaBusyId] = useState<string | null>(
    null,
  );
  const [dismissedDnaIds, setDismissedDnaIds] = useState<
    string[]
  >([]);
  const [savedProfile, setSavedProfile] =
    useState<TravelDNA | null>(null);

  const [pace, setPace] =
    useState<TravelPace | undefined>();
  const [interests, setInterests] =
    useState<TravelInterest[]>([]);
  const [travelStyle, setTravelStyle] =
    useState<TravelStyle | undefined>();
  const [budgetStyle, setBudgetStyle] =
    useState<BudgetStyle | undefined>();
  const [dailyRhythm, setDailyRhythm] =
    useState<DailyRhythm | undefined>();
  const [typicalParty, setTypicalParty] =
    useState<TypicalTravelParty | undefined>();

  const loadProfile = useCallback(
    async () => {
      setStatus('loading');

      try {
        const profile =
          await travelDNAService.get();

        setSavedProfile(profile);
        setPace(profile?.pace);
        setInterests(
          profile
            ? [...profile.interests]
            : [],
        );
        setTravelStyle(profile?.travelStyle);
        setBudgetStyle(profile?.budgetStyle);
        setDailyRhythm(profile?.dailyRhythm);
        setTypicalParty(profile?.typicalParty);

        setStatus('ready');
      } catch (error) {
        console.error(
          '[TravelDNA] Load failed:',
          error,
        );
        setStatus('error');
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile]),
  );

  const reflectionTrip = useMemo(() => {
    const completed = trips.find(
      (trip) => trip.status === 'completed',
    );
    return completed ?? trips[0] ?? null;
  }, [trips]);

  const dnaProposals = useMemo(
    () =>
      selectDnaReflectionProposals({
        travelDNA: savedProfile,
        brief,
        trip: reflectionTrip,
      }).filter(
        (proposal) => !dismissedDnaIds.includes(proposal.id),
      ),
    [savedProfile, brief, reflectionTrip, dismissedDnaIds],
  );

  const acceptDnaProposal = async (
    proposal: DnaReflectionProposal,
  ) => {
    if (dnaBusyId) {
      return;
    }

    setDnaBusyId(proposal.id);

    try {
      const next = applyDnaReflectionProposal(
        savedProfile,
        proposal,
      );
      const saved = await travelDNAService.save(next);
      setSavedProfile(saved);
      setPace(saved.pace);
      setInterests([...saved.interests]);
      setTravelStyle(saved.travelStyle);
      setBudgetStyle(saved.budgetStyle);
      setDailyRhythm(saved.dailyRhythm);
      setTypicalParty(saved.typicalParty);
      setDismissedDnaIds((current) => [
        ...current,
        proposal.id,
      ]);
    } catch (error) {
      Alert.alert(
        'Δεν αποθηκεύτηκε',
        error instanceof Error
          ? error.message
          : 'Δοκίμασε ξανά.',
      );
    } finally {
      setDnaBusyId(null);
    }
  };

  const toggleInterest = (
    value: TravelInterest,
  ) => {
    setInterests((current) =>
      current.includes(value)
        ? current.filter(
            (interest) =>
              interest !== value,
          )
        : [...current, value],
    );
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      await travelDNAService.save({
        pace,
        interests,
        travelStyle,
        budgetStyle,
        dailyRhythm,
        typicalParty,
      });

      Alert.alert(
        'Travel DNA saved',
        'Your preferences are saved on this device.',
      );
    } catch (error) {
      console.error(
        '[TravelDNA] Save failed:',
        error,
      );

      Alert.alert(
        'Could not save',
        'Your Travel DNA could not be saved. Please try again.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (status === 'loading') {
    return (
      <Screen>
        <UtilityScreenHeader
          eyebrow="YOUR TRAVELOS"
          title="Travel DNA"
          subtitle="The preferences you choose for how you like to travel."
          leading={<BackButton />}
        />

        <View style={styles.stateCard}>
          <ActivityIndicator
            color={colors.brand}
          />
          <Text style={styles.stateText}>
            Opening your Travel DNA…
          </Text>
        </View>
      </Screen>
    );
  }

  if (status === 'error') {
    return (
      <Screen>
        <UtilityScreenHeader
          eyebrow="YOUR TRAVELOS"
          title="Travel DNA"
          subtitle="The preferences you choose for how you like to travel."
          leading={<BackButton />}
        />

        <InlineError
          title="Travel DNA couldn't be opened."
          body="Your saved data has not been changed."
          onRetry={() => {
            void loadProfile();
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <UtilityScreenHeader
        eyebrow="ΤΟ TRAVELOS ΣΟΥ"
        title="Travel DNA"
        subtitle="Πες στο TravelOS πώς προτιμάς να ταξιδεύεις. Κάθε επιλογή μένει ρητή και επεξεργάσιμη."
        leading={<BackButton />}
      />

      <View style={styles.introCard}>
        <View style={styles.introIcon}>
          <Ionicons
            name="finger-print-outline"
            size={23}
            color={colors.brand}
          />
        </View>

        <View style={styles.introCopy}>
          <Text style={styles.introTitle}>
            Οι προτιμήσεις σου, επιλεγμένες από σένα.
          </Text>

          <Text style={styles.introBody}>
            Το TravelOS τις κρατά στη συσκευή και τις χρησιμοποιεί
            μόνο όταν το επιτρέψεις. Τίποτα δεν συμπεραίνεται σιωπηλά.
          </Text>
        </View>
      </View>

      {dnaProposals.length > 0 ? (
        <View style={styles.suggestionBlock}>
          <Text style={styles.suggestionEyebrow}>
            ΠΡΟΤΑΣΕΙΣ ΑΠΟ ΕΠΙΛΟΓΕΣ ΣΟΥ
          </Text>
          <Text style={styles.suggestionBody}>
            Επιβεβαίωσε για να γραφτούν στο DNA — αλλιώς άφησέ τις.
          </Text>
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
        </View>
      ) : null}

      <PreferenceSection
        eyebrow="PACE"
        title="How full should a trip feel?"
        helper="Choose one, or leave it open."
      >
        <ChoiceColumn
          options={PACE_OPTIONS}
          selected={pace}
          onSelect={(value) =>
            setPace(
              pace === value
                ? undefined
                : value,
            )
          }
        />
      </PreferenceSection>

      <PreferenceSection
        eyebrow="INTERESTS"
        title="What usually pulls you in?"
        helper="Choose as many as you like."
      >
        <ChipGrid
          options={INTEREST_OPTIONS}
          selected={interests}
          onToggle={toggleInterest}
        />
      </PreferenceSection>

      <PreferenceSection
        eyebrow="TRAVEL STYLE"
        title="Local life or iconic places?"
        helper="Choose one, or leave it open."
      >
        <ChoiceColumn
          options={STYLE_OPTIONS}
          selected={travelStyle}
          onSelect={(value) =>
            setTravelStyle(
              travelStyle === value
                ? undefined
                : value,
            )
          }
        />
      </PreferenceSection>

      <PreferenceSection
        eyebrow="BUDGET STYLE"
        title="How do you like to spend?"
        helper="This is a preference, not a trip budget."
      >
        <ChoiceColumn
          options={BUDGET_OPTIONS}
          selected={budgetStyle}
          onSelect={(value) =>
            setBudgetStyle(
              budgetStyle === value
                ? undefined
                : value,
            )
          }
        />
      </PreferenceSection>

      <PreferenceSection
        eyebrow="DAILY RHYTHM"
        title="When does travel feel best?"
        helper="Choose one, or leave it open."
      >
        <ChoiceColumn
          options={RHYTHM_OPTIONS}
          selected={dailyRhythm}
          onSelect={(value) =>
            setDailyRhythm(
              dailyRhythm === value
                ? undefined
                : value,
            )
          }
        />
      </PreferenceSection>

      <PreferenceSection
        eyebrow="TYPICAL PARTY"
        title="Who do you usually travel with?"
        helper="This can still vary from trip to trip."
      >
        <ChipGrid
          options={PARTY_OPTIONS}
          selected={
            typicalParty
              ? [typicalParty]
              : []
          }
          onToggle={(value) =>
            setTypicalParty(
              typicalParty === value
                ? undefined
                : value,
            )
          }
          single
        />
      </PreferenceSection>

      <View style={styles.saveArea}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save Travel DNA"
          disabled={isSaving}
          style={({ pressed }) => [
            styles.saveButton,
            pressed &&
              !isSaving &&
              styles.pressed,
            isSaving &&
              styles.saveButtonDisabled,
          ]}
          onPress={() => {
            void handleSave();
          }}
        >
          {isSaving ? (
            <ActivityIndicator
              color={colors.textInverse}
            />
          ) : (
            <>
              <Ionicons
                name="checkmark"
                size={20}
                color={colors.textInverse}
              />
              <Text style={styles.saveText}>
                Save Travel DNA
              </Text>
            </>
          )}
        </Pressable>

        <Text style={styles.saveHelper}>
          Tap any selected single-choice option again to clear it.
        </Text>
      </View>

      <View style={styles.bottomSpace} />
    </Screen>
  );
}

function BackButton() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back to Profile"
      style={({ pressed }) => [
        styles.backButton,
        pressed && styles.pressed,
      ]}
      onPress={() => router.back()}
    >
      <Ionicons
        name="chevron-back"
        size={22}
        color={colors.textPrimary}
      />
    </Pressable>
  );
}

function PreferenceSection({
  eyebrow,
  title,
  helper,
  children,
}: {
  eyebrow: string;
  title: string;
  helper: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionEyebrow}>
        {eyebrow}
      </Text>

      <Text style={styles.sectionTitle}>
        {title}
      </Text>

      <Text style={styles.sectionHelper}>
        {helper}
      </Text>

      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );
}

function ChoiceColumn<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: Array<{
    value: T;
    label: string;
    description: string;
  }>;
  selected?: T;
  onSelect: (value: T) => void;
}) {
  return (
    <View style={styles.choiceColumn}>
      {options.map((option) => {
        const isSelected =
          selected === option.value;

        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{
              checked: isSelected,
            }}
            style={({ pressed }) => [
              styles.choiceCard,
              isSelected &&
                styles.choiceCardSelected,
              pressed && styles.pressed,
            ]}
            onPress={() =>
              onSelect(option.value)
            }
          >
            <View style={styles.choiceCopy}>
              <Text
                style={[
                  styles.choiceLabel,
                  isSelected &&
                    styles.choiceLabelSelected,
                ]}
              >
                {option.label}
              </Text>

              <Text
                style={[
                  styles.choiceDescription,
                  isSelected &&
                    styles.choiceDescriptionSelected,
                ]}
              >
                {option.description}
              </Text>
            </View>

            <View
              style={[
                styles.choiceIndicator,
                isSelected &&
                  styles.choiceIndicatorSelected,
              ]}
            >
              {isSelected ? (
                <Ionicons
                  name="checkmark"
                  size={15}
                  color={colors.textInverse}
                />
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function ChipGrid<T extends string>({
  options,
  selected,
  onToggle,
  single = false,
}: {
  options: Array<{
    value: T;
    label: string;
  }>;
  selected: T[];
  onToggle: (value: T) => void;
  single?: boolean;
}) {
  return (
    <View style={styles.chipGrid}>
      {options.map((option) => {
        const isSelected =
          selected.includes(option.value);

        return (
          <Pressable
            key={option.value}
            accessibilityRole={
              single
                ? 'radio'
                : 'checkbox'
            }
            accessibilityLabel={option.label}
            accessibilityState={{
              checked: isSelected,
            }}
            style={({ pressed }) => [
              styles.chip,
              isSelected &&
                styles.chipSelected,
              pressed && styles.pressed,
            ]}
            onPress={() =>
              onToggle(option.value)
            }
          >
            {isSelected ? (
              <Ionicons
                name="checkmark"
                size={15}
                color={colors.textInverse}
              />
            ) : null}

            <Text
              style={[
                styles.chipText,
                isSelected &&
                  styles.chipTextSelected,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    width: 42,
    height: 42,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },

  pressed: {
    opacity: 0.72,
  },

  stateCard: {
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[5],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },

  stateTitle: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleSmall,
    lineHeight: lineHeight.titleSmall,
    color: colors.textPrimary,
    textAlign: 'center',
  },

  stateText: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  retryButton: {
    minHeight: 44,
    marginTop: spacing[2],
    paddingHorizontal: spacing[5],
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand,
  },

  retryText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textInverse,
  },

  introCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[4],
    padding: spacing[5],
    borderRadius: radius.lg,
    backgroundColor: colors.brandSoft,
  },

  introIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },

  introCopy: {
    flex: 1,
  },

  introTitle: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleSmall,
    lineHeight: lineHeight.titleSmall,
    color: colors.textPrimary,
  },

  introBody: {
    marginTop: spacing[2],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textSecondary,
  },

  suggestionBlock: {
    marginTop: spacing[5],
    gap: spacing[2],
  },

  suggestionEyebrow: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },

  suggestionBody: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textSecondary,
  },

  section: {
    marginTop: spacing[7],
  },

  sectionEyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.5,
    color: colors.brass,
  },

  sectionTitle: {
    marginTop: spacing[1],
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleSmall,
    lineHeight: lineHeight.titleSmall,
    color: colors.textPrimary,
  },

  sectionHelper: {
    marginTop: spacing[1],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textMuted,
  },

  sectionContent: {
    marginTop: spacing[3],
  },

  choiceColumn: {
    gap: spacing[2],
  },

  choiceCard: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },

  choiceCardSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },

  choiceCopy: {
    flex: 1,
  },

  choiceLabel: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textPrimary,
  },

  choiceLabelSelected: {
    color: colors.brand,
  },

  choiceDescription: {
    marginTop: spacing[1],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    color: colors.textSecondary,
  },

  choiceDescriptionSelected: {
    color: colors.textPrimary,
  },

  choiceIndicator: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },

  choiceIndicatorSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.brand,
  },

  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },

  chip: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },

  chipSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.brand,
  },

  chipText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.caption,
    color: colors.textPrimary,
  },

  chipTextSelected: {
    color: colors.textInverse,
  },

  saveArea: {
    marginTop: spacing[8],
  },

  saveButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    borderRadius: radius.md,
    backgroundColor: colors.brand,
  },

  saveButtonDisabled: {
    opacity: 0.6,
  },

  saveText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textInverse,
  },

  saveHelper: {
    marginTop: spacing[2],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },

  bottomSpace: {
    height: spacing[12],
  },
});
