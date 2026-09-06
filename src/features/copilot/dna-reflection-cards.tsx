import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DnaReflectionProposal } from '@/services/dna-reflection';
import {
  colors,
  fontFamily,
  fontSize,
  lineHeight,
  radius,
  spacing,
} from '@/theme';

type DnaReflectionCardsProps = {
  proposals: readonly DnaReflectionProposal[];
  busyId: string | null;
  onAccept: (proposal: DnaReflectionProposal) => void;
  onDismiss: (proposal: DnaReflectionProposal) => void;
};

export function DnaReflectionCards({
  proposals,
  busyId,
  onAccept,
  onDismiss,
}: DnaReflectionCardsProps) {
  if (proposals.length === 0) {
    return null;
  }

  return (
    <View style={styles.list}>
      <Text style={styles.eyebrow}>TRAVEL DNA</Text>
      <Text style={styles.lead}>
        Προαιρετικές αποθηκεύσεις από επιλογές που έκανες ήδη.
        Τίποτα δεν γράφεται πριν το επιβεβαιώσεις.
      </Text>
      {proposals.map((proposal) => (
        <View key={proposal.id} style={styles.card}>
          <Text style={styles.title}>{proposal.title}</Text>
          <Text style={styles.body}>{proposal.body}</Text>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Αποθήκευση ${proposal.id} στο Travel DNA`}
              disabled={busyId === proposal.id}
              style={styles.accept}
              onPress={() => onAccept(proposal)}
            >
              <Text style={styles.acceptLabel}>
                {busyId === proposal.id
                  ? 'Αποθήκευση…'
                  : 'Αποθήκευση στο DNA'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Παράλειψη ${proposal.id}`}
              disabled={busyId === proposal.id}
              style={styles.skip}
              onPress={() => onDismiss(proposal)}
            >
              <Text style={styles.skipLabel}>Όχι τώρα</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    marginTop: spacing[4],
    gap: spacing[3],
  },
  eyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.caption,
    letterSpacing: 1.2,
    color: colors.teal,
  },
  lead: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodySmall,
    color: colors.textMuted,
  },
  card: {
    padding: spacing[4],
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing[2],
  },
  title: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.body,
    color: colors.textPrimary,
  },
  body: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodySmall,
    color: colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  accept: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.md,
    backgroundColor: colors.brand,
  },
  acceptLabel: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textInverse,
  },
  skip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    justifyContent: 'center',
  },
  skipLabel: {
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.bodySmall,
    color: colors.textMuted,
  },
});
