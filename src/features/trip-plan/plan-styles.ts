import { StyleSheet } from 'react-native';

import {
  colors,
  fontFamily,
  fontSize,
  radius,
  spacing,
} from '@/theme';

/**
 * Presentation for the Plan screen and its stop editor.
 * Extracted verbatim from plan.tsx; no style values were changed.
 */
export const styles =
  StyleSheet.create({
    dayStripScroll: {
      marginBottom: spacing[4],
      marginHorizontal: -spacing[1],
    },

    dayStrip: {
      gap: spacing[2],
      paddingHorizontal: spacing[1],
      paddingBottom: spacing[1],
    },

    dayStripChip: {
      minWidth: 108,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[3],
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      gap: spacing[1],
    },

    dayStripChipSelected: {
      borderColor: colors.brand,
      backgroundColor: colors.brand,
    },

    dayStripWeekday: {
      fontFamily: fontFamily.sansBold,
      fontSize: 9,
      letterSpacing: 1.2,
      color: colors.brass,
    },

    dayStripWeekdaySelected: {
      color: colors.brass,
    },

    dayStripDate: {
      fontFamily: fontFamily.sansSemiBold,
      fontSize: fontSize.bodySmall,
      color: colors.textPrimary,
    },

    dayStripDateSelected: {
      color: colors.textInverse,
    },

    dayStripCity: {
      fontFamily: fontFamily.sansRegular,
      fontSize: fontSize.caption,
      color: colors.textMuted,
      maxWidth: 120,
    },

    dayStripCitySelected: {
      color: 'rgba(255,253,248,0.72)',
    },

    timeline: {
      gap:
        spacing[4],
    },

    daySection: {
      gap:
        spacing[2],
    },

    dayHeader: {
      flexDirection:
        'row',
      alignItems:
        'center',
      minHeight: 48,
      paddingBottom: spacing[1],
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },

    dayToggle: {
      flex: 1,
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
    },

    dayNumber: {
      width: 34,
      height: 34,
      borderRadius:
        radius.pill,
      backgroundColor:
        colors.brand,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    dayNumberText: {
      fontFamily:
        fontFamily.serifSemiBold,
      fontSize:
        fontSize.bodySmall,
      color:
        colors.textInverse,
    },

    dayCopy: {
      flex: 1,
      marginLeft:
        spacing[3],
    },

    dayLabel: {
      fontFamily:
        fontFamily.sansBold,
      fontSize:
        fontSize.micro,
      letterSpacing:
        1.4,
      color:
        colors.brass,
    },

    dayDate: {
      fontFamily:
        fontFamily.sansSemiBold,
      fontSize:
        fontSize.bodySmall,
      color:
        colors.textPrimary,
      marginTop: 2,
    },

    dayCity: {
      fontFamily:
        fontFamily.sansRegular,
      fontSize:
        fontSize.micro,
      color:
        colors.textSecondary,
      marginTop: 2,
    },

    dayCityChips: {
      gap: spacing[2],
      paddingTop: spacing[3],
      paddingBottom: spacing[1],
    },

    dayCityChip: {
      minHeight: 32,
      paddingHorizontal: spacing[3],
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },

    dayCityChipSelected: {
      borderColor: colors.brand,
      backgroundColor: colors.brandSoft,
    },

    dayCityChipText: {
      fontFamily: fontFamily.sansSemiBold,
      fontSize: fontSize.micro,
      color: colors.textSecondary,
    },

    dayCityChipTextSelected: {
      color: colors.brand,
    },

    addButton: {
      width: 40,
      height: 40,
      borderRadius:
        radius.pill,
      backgroundColor:
        colors.surface,
      borderWidth: 1,
      borderColor:
        colors.border,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    emptyDay: {
      minHeight: 38,
      flexDirection:
        'row',
      alignItems:
        'center',
      paddingLeft: 46,
      paddingRight:
        spacing[2],
      gap:
        spacing[2],
    },

    emptyDayText: {
      fontFamily:
        fontFamily.sansMedium,
      fontSize:
        fontSize.bodySmall,
      color:
        colors.teal,
    },

    stopList: {
      gap:
        spacing[2],
    },

    conflictList: {
      gap:
        spacing[2],
      marginBottom:
        spacing[2],
    },

    conflictCard: {
      minHeight: 64,
      marginLeft: 46,
      flexDirection:
        'row',
      alignItems:
        'center',
      gap:
        spacing[3],
      paddingHorizontal:
        spacing[3],
      paddingVertical:
        spacing[3],
      borderRadius:
        radius.md,
      borderWidth: 1,
      borderColor:
        colors.warning,
      backgroundColor:
        colors.brassSoft,
    },

    conflictIcon: {
      width: 34,
      height: 34,
      borderRadius:
        radius.pill,
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        colors.surface,
    },

    conflictCopy: {
      flex: 1,
    },

    conflictEyebrow: {
      fontFamily:
        fontFamily.sansBold,
      fontSize:
        fontSize.micro,
      letterSpacing: 1.1,
      color:
        colors.warning,
    },

    conflictTitle: {
      marginTop: 2,
      fontFamily:
        fontFamily.sansSemiBold,
      fontSize:
        fontSize.bodySmall,
      color:
        colors.textPrimary,
    },

    conflictMeta: {
      marginTop: 2,
      fontFamily:
        fontFamily.sansRegular,
      fontSize:
        fontSize.caption,
      color:
        colors.textSecondary,
    },

    stopWithGap: {
      gap:
        spacing[2],
    },

    stopCard: {
      minHeight: 70,
      backgroundColor:
        colors.surface,
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius:
        radius.md,
      flexDirection:
        'row',
      alignItems:
        'center',
      paddingHorizontal:
        spacing[3],
    },

    freeTimeCard: {
      minHeight: 54,
      marginLeft: 46,
      gap:
        spacing[3],
      paddingHorizontal:
        spacing[3],
      paddingVertical:
        spacing[3],
      borderRadius:
        radius.md,
      borderWidth: 1,
      borderColor:
        colors.teal,
      backgroundColor:
        colors.tealSoft,
    },

    freeTimeHeader: {
      flexDirection:
        'row',
      alignItems:
        'center',
      gap:
        spacing[3],
    },

    freeTimeIcon: {
      width: 32,
      height: 32,
      borderRadius:
        radius.pill,
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        colors.surface,
    },

    freeTimeCopy: {
      flex: 1,
    },

    freeTimeEyebrow: {
      fontFamily:
        fontFamily.sansBold,
      fontSize:
        fontSize.micro,
      letterSpacing: 1.1,
      color:
        colors.teal,
    },

    freeTimeRange: {
      marginTop: 2,
      fontFamily:
        fontFamily.sansSemiBold,
      fontSize:
        fontSize.bodySmall,
      color:
        colors.textPrimary,
    },

    freeTimeDuration: {
      fontFamily:
        fontFamily.sansMedium,
      fontSize:
        fontSize.caption,
      color:
        colors.textSecondary,
    },

    freeTimeAIButton: {
      minHeight: 42,
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
      paddingHorizontal:
        spacing[3],
    },

    freeTimeAIButtonDisabled: {
      opacity: 0.5,
    },

    freeTimeAIButtonText: {
      fontFamily:
        fontFamily.sansSemiBold,
      fontSize:
        fontSize.bodySmall,
      color:
        colors.textInverse,
    },

    freeTimeAIError: {
      fontFamily:
        fontFamily.sansRegular,
      fontSize:
        fontSize.caption,
      lineHeight: 18,
      color:
        colors.danger,
    },

    freeTimeSuggestionList: {
      gap:
        spacing[2],
      paddingTop:
        spacing[1],
      borderTopWidth: 1,
      borderTopColor:
        colors.border,
    },

    freeTimeSuggestionHeadingRow: {
      flexDirection:
        'row',
      alignItems:
        'center',
      gap: 6,
      marginBottom: 2,
    },

    freeTimeSuggestionHeading: {
      fontFamily:
        fontFamily.sansBold,
      fontSize:
        fontSize.micro,
      letterSpacing: 1.1,
      color:
        colors.brass,
    },

    freeTimeSuggestionNote: {
      marginBottom: 4,
      fontFamily:
        fontFamily.sansRegular,
      fontSize:
        fontSize.caption,
      lineHeight: 17,
      color:
        colors.textSecondary,
    },

    freeTimeSuggestionCard: {
      minHeight: 68,
      flexDirection:
        'row',
      alignItems:
        'center',
      gap:
        spacing[2],
      padding:
        spacing[2],
      borderRadius:
        radius.sm,
      backgroundColor:
        colors.surface,
      borderWidth: 1,
      borderColor:
        colors.border,
    },

    freeTimeSuggestionIcon: {
      width: 34,
      height: 34,
      borderRadius:
        radius.pill,
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        colors.tealSoft,
    },

    freeTimeSuggestionCopy: {
      flex: 1,
    },

    freeTimeSuggestionTitle: {
      fontFamily:
        fontFamily.sansSemiBold,
      fontSize:
        fontSize.bodySmall,
      color:
        colors.textPrimary,
    },

    freeTimeSuggestionBody: {
      marginTop: 2,
      fontFamily:
        fontFamily.sansRegular,
      fontSize:
        fontSize.caption,
      lineHeight: 17,
      color:
        colors.textSecondary,
    },

    freeTimeSuggestionMinutes: {
      fontFamily:
        fontFamily.sansBold,
      fontSize:
        fontSize.micro,
      color:
        colors.teal,
    },

    freeTimeAIHint: {
      fontFamily:
        fontFamily.sansRegular,
      fontSize:
        fontSize.micro,
      lineHeight: 16,
      color:
        colors.textMuted,
    },

    stopMain: {
      flex: 1,
      minHeight: 68,
      flexDirection:
        'row',
      alignItems:
        'center',
    },

    stopIcon: {
      width: 40,
      height: 40,
      borderRadius:
        radius.sm,
      backgroundColor:
        colors.tealSoft,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    stopCopy: {
      flex: 1,
      marginLeft:
        spacing[3],
    },

    stopTitle: {
      fontFamily:
        fontFamily.sansSemiBold,
      fontSize:
        fontSize.body,
      color:
        colors.textPrimary,
    },

    stopMeta: {
      fontFamily:
        fontFamily.sansRegular,
      fontSize:
        fontSize.caption,
      color:
        colors.textMuted,
      marginTop: 3,
      textTransform:
        'capitalize',
    },

    mappedRow: {
      flexDirection:
        'row',
      alignItems:
        'center',
      gap: 4,
      marginTop: 5,
    },

    livedRow: {
      flexDirection:
        'row',
      alignItems:
        'center',
      gap: 4,
      marginTop: 5,
    },

    livedText: {
      fontFamily:
        fontFamily.sansBold,
      fontSize:
        fontSize.micro,
      letterSpacing: 0.6,
      color:
        colors.teal,
      textTransform:
        'uppercase',
    },

    livedSkippedText: {
      fontFamily:
        fontFamily.sansBold,
      fontSize:
        fontSize.micro,
      letterSpacing: 0.6,
      color:
        colors.brass,
      textTransform:
        'uppercase',
    },

    sheetLivedNote: {
      marginTop: 6,
      maxWidth: 220,
      fontFamily:
        fontFamily.sansRegular,
      fontSize:
        fontSize.caption,
      lineHeight: 17,
      color:
        colors.textSecondary,
    },

    mappedText: {
      fontFamily:
        fontFamily.sansBold,
      fontSize:
        fontSize.micro,
      letterSpacing: 0.6,
      color:
        colors.teal,
      textTransform:
        'uppercase',
    },

    linkedBookingRow: {
      flexDirection:
        'row',
      alignItems:
        'center',
      gap: 4,
      marginTop: 5,
    },

    linkedBookingText: {
      fontFamily:
        fontFamily.sansBold,
      fontSize:
        fontSize.micro,
      letterSpacing: 0.5,
      color:
        colors.brass,
      textTransform:
        'uppercase',
    },

    stopActions: {
      flexDirection:
        'row',
      gap: 2,
    },

    smallAction: {
      width: 34,
      height: 44,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    actionDisabled: {
      opacity: 0.22,
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
        spacing[4],
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

      justifyContent:
        'space-between',

      alignItems:
        'flex-start',

      marginBottom:
        spacing[6],
    },

    sheetEyebrow: {
      fontFamily:
        fontFamily.sansBold,

      fontSize:
        fontSize.micro,

      letterSpacing:
        1.5,

      color:
        colors.brass,
    },

    sheetTitle: {
      fontFamily:
        fontFamily.serifSemiBold,

      fontSize:
        fontSize.title,

      color:
        colors.textPrimary,

      marginTop:
        spacing[1],
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

    typeRow: {
      flexDirection:
        'row',

      gap:
        spacing[2],

      marginTop:
        spacing[2],

      marginBottom:
        spacing[5],
    },

    typeButton: {
      flex: 1,

      minHeight: 62,

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

      letterSpacing:
        1.3,

      color:
        colors.brass,
    },

    timeSection: {
      gap:
        spacing[2],

      marginBottom:
        spacing[4],
    },

    timeRow: {
      flexDirection:
        'row',

      gap:
        spacing[2],
    },

    timeColumn: {
      flex: 1,
      minWidth: 0,
    },

    timeHelp: {
      fontFamily:
        fontFamily.sansRegular,

      fontSize:
        fontSize.caption,

      lineHeight: 18,

      color:
        colors.textMuted,
    },

    input: {
      height: 54,

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

    locationLabelRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },

    locationReady: {
      fontFamily:
        fontFamily.sansBold,

      fontSize:
        fontSize.micro,

      letterSpacing: 0.7,

      color:
        colors.teal,
    },

    locationCard: {
      minHeight: 88,

      backgroundColor:
        colors.surface,

      borderWidth: 1,

      borderColor:
        colors.border,

      borderRadius:
        radius.md,

      flexDirection:
        'row',

      alignItems:
        'center',

      padding:
        spacing[4],
    },

    locationIcon: {
      width: 42,
      height: 42,

      borderRadius:
        radius.sm,

      backgroundColor:
        colors.tealSoft,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight:
        spacing[3],
    },

    locationCopy: {
      flex: 1,

      paddingRight:
        spacing[3],
    },

    locationName: {
      fontFamily:
        fontFamily.sansSemiBold,

      fontSize:
        fontSize.bodySmall,

      color:
        colors.textPrimary,
    },

    locationAddress: {
      fontFamily:
        fontFamily.sansRegular,

      fontSize:
        fontSize.caption,

      lineHeight: 18,

      color:
        colors.textSecondary,

      marginTop: 3,
    },

    locationEmpty: {
      minHeight: 82,

      borderRadius:
        radius.md,

      borderWidth: 1,

      borderStyle:
        'dashed',

      borderColor:
        colors.borderStrong,

      flexDirection:
        'row',

      alignItems:
        'center',

      padding:
        spacing[4],
    },

    locationEmptyCopy: {
      flex: 1,

      marginLeft:
        spacing[3],
    },

    locationEmptyTitle: {
      fontFamily:
        fontFamily.sansSemiBold,

      fontSize:
        fontSize.bodySmall,

      color:
        colors.textPrimary,
    },

    locationEmptyBody: {
      fontFamily:
        fontFamily.sansRegular,

      fontSize:
        fontSize.caption,

      color:
        colors.textMuted,

      marginTop: 2,
    },

    locationActions: {
      flexDirection:
        'row',

      gap:
        spacing[2],

      marginTop:
        spacing[3],
    },

    locationButton: {
      flex: 1,

      height: 50,

      borderRadius:
        radius.md,

      backgroundColor:
        colors.teal,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        spacing[2],
    },

    locationButtonText: {
      fontFamily:
        fontFamily.sansSemiBold,

      fontSize:
        fontSize.bodySmall,

      color:
        colors.textInverse,
    },

    removeLocationButton: {
      width: 50,
      height: 50,

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
        spacing[3],
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
        spacing[6],
    },
  });
