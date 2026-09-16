import { StyleSheet } from 'react-native';

import {
  colors,
  fontFamily,
  fontSize,
  lineHeight,
  radius,
  shadows,
  spacing,
} from '@/theme';

/**
 * Presentation for the Bookings screen, its editor sheet and shared fields.
 * Extracted verbatim from bookings.tsx; no style values were changed.
 */
export const styles =
  StyleSheet.create({
    addButton: {
      width: 48,
      height: 48,

      borderRadius:
        radius.pill,

      backgroundColor:
        colors.brand,

      alignItems:
        'center',

      justifyContent:
        'center',

      ...shadows.subtle,
    },

    importLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
      alignSelf: 'flex-start',
      marginTop: spacing[4],
      marginBottom: spacing[4],
    },

    importLinkText: {
      fontFamily: fontFamily.sansSemiBold,
      fontSize: fontSize.bodySmall,
      color: colors.brand,
    },

    emptyCard: {
      backgroundColor:
        colors.surfaceWarm,

      borderRadius:
        radius.xl,

      borderWidth: 1,

      borderColor:
        colors.border,

      padding:
        spacing[7],

      ...shadows.subtle,
    },

    emptyIcon: {
      width: 56,
      height: 56,

      borderRadius:
        radius.md,

      backgroundColor:
        colors.brandSoft,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginBottom:
        spacing[5],
    },

    emptyTitle: {
      fontFamily:
        fontFamily.serifSemiBold,

      fontSize:
        fontSize.title,

      lineHeight:
        lineHeight.title,

      color:
        colors.textPrimary,

      marginBottom:
        spacing[3],
    },

    emptyBody: {
      fontFamily:
        fontFamily.sansRegular,

      fontSize:
        fontSize.bodySmall,

      lineHeight:
        lineHeight.bodySmall,

      color:
        colors.textSecondary,

      marginBottom:
        spacing[6],
    },

    primaryButton: {
      height: 54,

      borderRadius:
        radius.md,

      backgroundColor:
        colors.brand,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        spacing[2],
    },

    primaryButtonText: {
      fontFamily:
        fontFamily.sansSemiBold,

      fontSize:
        fontSize.body,

      color:
        colors.textInverse,
    },

    bookingList: {
      gap:
        spacing[4],
    },

    bookingCard: {
      backgroundColor:
        colors.surface,

      borderWidth: 1,

      borderColor:
        colors.border,

      borderRadius:
        radius.lg,

      flexDirection:
        'row',

      padding:
        spacing[4],

      ...shadows.subtle,
    },

    bookingCardConfirmed: {
      borderLeftWidth: 3,
      borderLeftColor: colors.brand,
    },

    bookingIcon: {
      width: 46,
      height: 46,

      borderRadius:
        radius.md,

      backgroundColor:
        colors.tealSoft,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight:
        spacing[4],
    },

    bookingContent: {
      flex: 1,
      gap: spacing[2],
    },

    bookingTop: {
      flexDirection:
        'row',

      justifyContent:
        'space-between',

      alignItems: 'center',

      gap:
        spacing[3],
    },

    bookingTypeEyebrow: {
      fontFamily:
        fontFamily.sansBold,
      fontSize: fontSize.micro,
      letterSpacing: 1.3,
      color: colors.brass,
      textTransform: 'uppercase',
    },

    bookingTitleWrap: {
      flex: 1,
    },

    bookingTitle: {
      fontFamily:
        fontFamily.serifSemiBold,

      fontSize:
        fontSize.titleSmall,

      lineHeight:
        lineHeight.titleSmall,

      color:
        colors.textPrimary,
    },

    bookingTemporal: {
      fontFamily:
        fontFamily.sansMedium,
      fontSize: fontSize.caption,
      color: colors.textSecondary,
    },

    bookingMetaLine: {
      fontFamily:
        fontFamily.sansRegular,
      fontSize: fontSize.caption,
      color: colors.textMuted,
      textTransform: 'capitalize',
      minHeight: 16,
    },

    quickActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing[2],
      marginTop: spacing[3],
    },

    quickAction: {
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceWarm,
    },

    quickActionText: {
      fontFamily: fontFamily.sansSemiBold,
      fontSize: fontSize.caption,
      color: colors.teal,
    },

    provider: {
      fontFamily:
        fontFamily.sansRegular,

      fontSize:
        fontSize.caption,

      color:
        colors.textMuted,

      marginTop: 3,
    },

    statusPill: {
      alignSelf:
        'flex-start',

      backgroundColor:
        colors.tealSoft,

      borderRadius:
        radius.pill,

      paddingHorizontal:
        spacing[2],

      paddingVertical:
        spacing[1],
    },

    statusCancelled: {
      backgroundColor:
        colors.coralSoft,
    },

    statusCompleted: {
      backgroundColor:
        colors.brandSoft,
    },

    statusConfirmed: {
      backgroundColor:
        colors.brassSoft,
    },

    statusText: {
      fontFamily:
        fontFamily.sansBold,

      fontSize: 9,

      color:
        colors.textSecondary,

      letterSpacing: 0.6,
    },

    metaRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        spacing[2],

      marginTop:
        spacing[3],
    },

    metaText: {
      fontFamily:
        fontFamily.sansRegular,

      fontSize:
        fontSize.caption,

      color:
        colors.textSecondary,
    },

    linkedStopRow: {
      minHeight: 58,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[3],
      marginTop: spacing[4],
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      borderRadius: radius.md,
      backgroundColor: colors.tealSoft,
    },

    linkedStopIcon: {
      width: 32,
      height: 32,
      borderRadius: radius.sm,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },

    linkedStopCopy: {
      flex: 1,
    },

    linkedStopLabel: {
      fontFamily: fontFamily.sansBold,
      fontSize: fontSize.micro,
      letterSpacing: 0.8,
      color: colors.teal,
    },

    linkedStopTitle: {
      marginTop: 2,
      fontFamily: fontFamily.sansMedium,
      fontSize: fontSize.caption,
      color: colors.textPrimary,
    },

    linkedAccommodationRow: {
      minHeight: 58,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[3],
      marginTop: spacing[3],
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      borderRadius: radius.md,
      backgroundColor: colors.brandSoft,
    },

    linkedAccommodationIcon: {
      width: 32,
      height: 32,
      borderRadius: radius.sm,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },

    linkedAccommodationLabel: {
      fontFamily: fontFamily.sansBold,
      fontSize: fontSize.micro,
      letterSpacing: 0.8,
      color: colors.brand,
    },

    bookingFooter: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      marginTop:
        spacing[4],

      paddingTop:
        spacing[4],

      borderTopWidth: 1,

      borderTopColor:
        colors.border,
    },

    priceWrap: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        spacing[3],
    },

    amount: {
      fontFamily:
        fontFamily.sansSemiBold,

      fontSize:
        fontSize.bodySmall,

      color:
        colors.textPrimary,
    },

    paymentStatus: {
      fontFamily:
        fontFamily.sansBold,

      fontSize:
        fontSize.micro,

      color:
        colors.warning,

      letterSpacing: 0.8,
    },

    paymentPaid: {
      color:
        colors.success,
    },

    deleteButton: {
      width: 34,
      height: 34,

      borderRadius:
        radius.pill,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.coralSoft,
    },

    pressed: {
      opacity: 0.82,
    },

    modalBackdrop: {
      flex: 1,

      justifyContent:
        'flex-end',

      backgroundColor:
        colors.overlay,
    },

    sheet: {
      maxHeight: '92%',

      backgroundColor:
        colors.background,

      borderTopLeftRadius:
        radius.xxl,

      borderTopRightRadius:
        radius.xxl,

      paddingHorizontal:
        spacing[6],

      paddingBottom:
        spacing[8],
    },

    sheetHandle: {
      width: 42,
      height: 5,

      borderRadius:
        radius.pill,

      backgroundColor:
        colors.borderStrong,

      alignSelf:
        'center',

      marginTop:
        spacing[3],

      marginBottom:
        spacing[5],
    },

    sheetHeader: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      justifyContent:
        'space-between',

      marginBottom:
        spacing[6],
    },


    sheetTitle: {
      fontFamily:
        fontFamily.serifSemiBold,

      fontSize:
        fontSize.title,

      color:
        colors.textPrimary,

      marginTop: 0,
    },

    closeButton: {
      width: 40,
      height: 40,

      borderRadius:
        radius.pill,

      backgroundColor:
        colors.surface,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    field: {
      gap:
        spacing[2],

      marginBottom:
        spacing[4],
    },

    fieldLabel: {
      fontFamily:
        fontFamily.sansBold,

      fontSize:
        fontSize.micro,

      letterSpacing: 1.3,

      color:
        colors.brass,

      marginBottom:
        spacing[2],
    },

    stopPickerSummary: {
      minHeight: 66,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[3],
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      backgroundColor: colors.surface,
    },

    stopPickerIcon: {
      width: 38,
      height: 38,
      borderRadius: radius.sm,
      backgroundColor: colors.tealSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },

    stopPickerCopy: {
      flex: 1,
    },

    stopPickerLabel: {
      fontFamily: fontFamily.sansBold,
      fontSize: fontSize.micro,
      letterSpacing: 0.8,
      color: colors.teal,
    },

    stopPickerTitle: {
      marginTop: 3,
      fontFamily: fontFamily.sansMedium,
      fontSize: fontSize.bodySmall,
      color: colors.textPrimary,
    },

    stopChoices: {
      gap: spacing[2],
      marginTop: spacing[2],
      padding: spacing[2],
      borderRadius: radius.md,
      backgroundColor: colors.backgroundSoft,
    },

    stopChoice: {
      minHeight: 58,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[3],
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: 'transparent',
      backgroundColor: colors.surface,
    },

    stopChoiceSelected: {
      borderColor: colors.teal,
      backgroundColor: colors.tealSoft,
    },

    stopChoiceIcon: {
      width: 32,
      height: 32,
      borderRadius: radius.sm,
      backgroundColor: colors.backgroundSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },

    stopChoiceCopy: {
      flex: 1,
    },

    stopChoiceTitle: {
      fontFamily: fontFamily.sansSemiBold,
      fontSize: fontSize.bodySmall,
      color: colors.textPrimary,
    },

    stopChoiceMeta: {
      marginTop: 3,
      fontFamily: fontFamily.sansRegular,
      fontSize: fontSize.micro,
      color: colors.textMuted,
      textTransform: 'capitalize',
    },

    stopChoicesEmpty: {
      padding: spacing[4],
      fontFamily: fontFamily.sansRegular,
      fontSize: fontSize.caption,
      lineHeight: lineHeight.caption,
      color: colors.textSecondary,
    },

    relationshipHelp: {
      marginTop: spacing[2],
      marginBottom: spacing[5],
      fontFamily: fontFamily.sansRegular,
      fontSize: fontSize.caption,
      lineHeight: lineHeight.caption,
      color: colors.textMuted,
    },

    temporalField: {
      gap: spacing[3],
      marginBottom: spacing[5],
      padding: spacing[3],
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.backgroundSoft,
    },

    temporalSectionLabel: {
      fontFamily: fontFamily.sansBold,
      fontSize: fontSize.micro,
      letterSpacing: 1.3,
      color: colors.brass,
    },

    temporalRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing[2],
    },

    temporalHalf: {
      flex: 1,
      minWidth: 0,
    },

    preservedTimeCard: {
      gap: spacing[3],
      padding: spacing[4],
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },

    preservedTimeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
    },

    preservedTimeTitle: {
      fontFamily: fontFamily.sansSemiBold,
      fontSize: fontSize.bodySmall,
      color: colors.textPrimary,
    },

    preservedTimeValue: {
      fontFamily: fontFamily.sansMedium,
      fontSize: fontSize.caption,
      color: colors.textPrimary,
    },

    preservedTimeBody: {
      fontFamily: fontFamily.sansRegular,
      fontSize: fontSize.caption,
      lineHeight: lineHeight.caption,
      color: colors.textSecondary,
    },

    preservedTimeActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing[2],
    },

    timeActionPrimary: {
      minHeight: 40,
      justifyContent: 'center',
      paddingHorizontal: spacing[3],
      borderRadius: radius.pill,
      backgroundColor: colors.brand,
    },

    timeActionPrimaryText: {
      fontFamily: fontFamily.sansSemiBold,
      fontSize: fontSize.caption,
      color: colors.textInverse,
    },

    timeActionSecondary: {
      minHeight: 40,
      justifyContent: 'center',
      paddingHorizontal: spacing[3],
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },

    timeActionSecondaryText: {
      fontFamily: fontFamily.sansSemiBold,
      fontSize: fontSize.caption,
      color: colors.textSecondary,
    },

    clearTemporalValue: {
      alignSelf: 'flex-end',
      fontFamily: fontFamily.sansBold,
      fontSize: fontSize.micro,
      letterSpacing: 1,
      color: colors.brand,
    },

    input: {
      minHeight: 54,

      borderRadius:
        radius.md,

      backgroundColor:
        colors.surface,

      borderWidth: 1,

      borderColor:
        colors.border,

      paddingHorizontal:
        spacing[4],

      fontFamily:
        fontFamily.sansMedium,

      fontSize:
        fontSize.body,

      color:
        colors.textPrimary,
    },

    multilineInput: {
      minHeight: 96,

      paddingTop:
        spacing[4],

      textAlignVertical:
        'top',
    },

    typeGrid: {
      flexDirection:
        'row',

      flexWrap:
        'wrap',

      gap:
        spacing[2],

      marginBottom:
        spacing[5],
    },

    typeButton: {
      width: '22%',

      minHeight: 54,

      borderRadius:
        radius.md,

      borderWidth: 1,

      borderColor:
        colors.border,

      backgroundColor:
        colors.surface,

      alignItems:
        'center',

      justifyContent:
        'center',

      gap: 4,
    },

    typeButtonSelected: {
      backgroundColor:
        colors.brand,

      borderColor:
        colors.brand,
    },

    typeText: {
      fontFamily:
        fontFamily.sansMedium,

      fontSize:
        fontSize.micro,

      color:
        colors.textPrimary,
    },

    typeTextSelected: {
      color:
        colors.textInverse,
    },

    statusSelector: {
      flexDirection:
        'row',

      flexWrap:
        'wrap',

      gap:
        spacing[2],

      marginBottom:
        spacing[6],
    },

    statusOption: {
      borderRadius:
        radius.pill,

      borderWidth: 1,

      borderColor:
        colors.border,

      backgroundColor:
        colors.surface,

      paddingHorizontal:
        spacing[3],

      paddingVertical:
        spacing[2],
    },

    statusOptionSelected: {
      backgroundColor:
        colors.brand,

      borderColor:
        colors.brand,
    },

    statusOptionText: {
      fontFamily:
        fontFamily.sansMedium,

      fontSize:
        fontSize.caption,

      color:
        colors.textSecondary,
    },

    statusOptionTextSelected: {
      color:
        colors.textInverse,
    },

    amountRow: {
      flexDirection:
        'row',

      gap:
        spacing[3],
    },

    amountField: {
      flex: 2,
    },

    currencyField: {
      flex: 1,
    },

    paidRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      backgroundColor:
        colors.surface,

      borderWidth: 1,

      borderColor:
        colors.border,

      borderRadius:
        radius.md,

      padding:
        spacing[4],

      marginBottom:
        spacing[5],
    },

    paidCopy: {
      flex: 1,

      paddingRight:
        spacing[4],
    },

    paidTitle: {
      fontFamily:
        fontFamily.sansSemiBold,

      fontSize:
        fontSize.body,

      color:
        colors.textPrimary,
    },

    paidDescription: {
      fontFamily:
        fontFamily.sansRegular,

      fontSize:
        fontSize.caption,

      color:
        colors.textMuted,

      marginTop: 3,
    },

    saveButton: {
      height: 56,

      borderRadius:
        radius.md,

      backgroundColor:
        colors.brand,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        spacing[3],

      marginTop:
        spacing[4],
    },

    saveButtonText: {
      fontFamily:
        fontFamily.sansSemiBold,

      fontSize:
        fontSize.body,

      color:
        colors.textInverse,
    },

    disabled: {
      opacity: 0.6,
    },

    bottomSpace: {
      height:
        spacing[12],
    },

    sheetBottomSpace: {
      height:
        spacing[10],
    },
  });
