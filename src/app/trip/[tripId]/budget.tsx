import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import {
  useMemo,
  useState,
} from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import { Screen } from '@/components/ui/screen';
import { UtilityScreenHeader } from '@/components/ui/utility-screen';
import type {
  BudgetCategory,
  BudgetItem,
} from '@/domain/entities';
import {
  useTripWorkspace,
  useTripWorkspaceFocusRefresh,
} from '@/features/trip-workspace/trip-workspace-context';
import {
  BUDGET_CATEGORIES,
  calculateBudgetSummary,
  normalizeCurrencyCode,
} from '@/services/budget-calculations';
import {
  colors,
  fontFamily,
  fontSize,
  lineHeight,
  radius,
  shadows,
  spacing,
} from '@/theme';

const CATEGORY_DETAILS: Record<
  BudgetCategory,
  {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
  }
> = {
  accommodation: {
    label: 'Accommodation',
    icon: 'bed-outline',
    color: colors.teal,
  },
  transport: {
    label: 'Transport',
    icon: 'train-outline',
    color: colors.brass,
  },
  food: {
    label: 'Food',
    icon: 'restaurant-outline',
    color: colors.coral,
  },
  activities: {
    label: 'Activities',
    icon: 'sparkles-outline',
    color: colors.success,
  },
  shopping: {
    label: 'Shopping',
    icon: 'bag-handle-outline',
    color: colors.warning,
  },
  insurance: {
    label: 'Insurance',
    icon: 'shield-checkmark-outline',
    color: colors.textSecondary,
  },
  other: {
    label: 'Other',
    icon: 'ellipsis-horizontal-outline',
    color: colors.textMuted,
  },
};

function formatMoney(
  amount: number,
  currencyCode: string,
): string {
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0');
  const day = String(date.getDate()).padStart(
    2,
    '0',
  );

  return `${year}-${month}-${day}`;
}

function fromDateKey(value: string): Date {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      value,
    );

  if (!match) {
    return new Date();
  }

  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
}

function formatDate(value?: string): string {
  if (!value) {
    return 'Date not recorded';
  }

  return fromDateKey(value).toLocaleDateString(
    'en-GB',
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    },
  );
}

export default function BudgetScreen() {
  const router = useRouter();
  const { workspace, actions } =
    useTripWorkspace();

  useTripWorkspaceFocusRefresh();

  const accountingCurrency =
    normalizeCurrencyCode(
      workspace.trip.accountingCurrency,
    );

  const summary = useMemo(
    () =>
      calculateBudgetSummary(
        workspace.budget,
        accountingCurrency,
        workspace.fxRates,
      ),
    [
      accountingCurrency,
      workspace.budget,
      workspace.fxRates,
    ],
  );

  const expenses = useMemo(
    () =>
      [...(workspace.budget?.items ?? [])].sort(
        (a, b) =>
          (b.date ?? b.createdAt).localeCompare(
            a.date ?? a.createdAt,
          ),
      ),
    [workspace.budget],
  );

  const [planModalVisible, setPlanModalVisible] =
    useState(false);
  const [plannedAmount, setPlannedAmount] =
    useState('');
  const [expenseModalVisible, setExpenseModalVisible] =
    useState(false);
  const [editingExpense, setEditingExpense] =
    useState<BudgetItem | null>(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(
    accountingCurrency,
  );
  const [category, setCategory] =
    useState<BudgetCategory>('other');
  const [expenseDate, setExpenseDate] =
    useState('');
  const [notes, setNotes] = useState('');
  const [bookingId, setBookingId] =
    useState<string | undefined>();
  const [stopId, setStopId] =
    useState<string | undefined>();
  const [showIOSDatePicker, setShowIOSDatePicker] =
    useState(false);
  const [isSaving, setIsSaving] =
    useState(false);
  const [fxFromCurrency, setFxFromCurrency] =
    useState('');
  const [fxRate, setFxRate] = useState('');
  const [fxAsOf, setFxAsOf] = useState('');

  const openPlan = () => {
    setPlannedAmount(
      workspace.budget?.plannedAmount?.toString() ??
        '',
    );
    setPlanModalVisible(true);
  };

  const openTripCurrencySettings = () => {
    setPlanModalVisible(false);
    router.push({
      pathname: '/trip/[tripId]/details',
      params: {
        tripId: workspace.trip.id,
      },
    });
  };

  const resetExpenseForm = () => {
    setEditingExpense(null);
    setTitle('');
    setAmount('');
    setCurrency(accountingCurrency);
    setCategory('other');
    setExpenseDate('');
    setNotes('');
    setBookingId(undefined);
    setStopId(undefined);
    setShowIOSDatePicker(false);
  };

  const openCreateExpense = () => {
    resetExpenseForm();
    setExpenseModalVisible(true);
  };

  const openEditExpense = (
    expense: BudgetItem,
  ) => {
    setEditingExpense(expense);
    setTitle(expense.title);
    setAmount(expense.amount.toString());
    setCurrency(expense.currencyCode);
    setCategory(expense.category);
    setExpenseDate(expense.date ?? '');
    setNotes(expense.notes ?? '');
    setBookingId(expense.bookingId);
    setStopId(expense.stopId);
    setShowIOSDatePicker(false);
    setExpenseModalVisible(true);
  };

  const closeExpense = () => {
    setExpenseModalVisible(false);
    resetExpenseForm();
  };

  const savePlannedBudget = async () => {
    const parsed = Number(
      plannedAmount.replace(',', '.'),
    );

    if (
      plannedAmount.trim() === '' ||
      !Number.isFinite(parsed) ||
      parsed < 0
    ) {
      Alert.alert(
        'Check the budget',
        'Enter a planned amount of zero or more.',
      );
      return;
    }

    try {
      setIsSaving(true);
      await actions.setPlannedBudget(parsed);
      setPlanModalVisible(false);
    } catch (error) {
      console.error(
        '[Budget] Plan save error:',
        error,
      );
      Alert.alert(
        'Could not save budget',
        'Your existing budget data was not changed. Please try again.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (event.type === 'set' && selectedDate) {
      setExpenseDate(toDateKey(selectedDate));
    }
  };

  const openDatePicker = () => {
    const value = fromDateKey(expenseDate);

    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode: 'date',
        onChange: handleDateChange,
      });
      return;
    }

    setShowIOSDatePicker(true);
  };

  const saveExpense = async () => {
    const parsedAmount = Number(
      amount.replace(',', '.'),
    );
    const cleanCurrency = normalizeCurrencyCode(
      currency,
    );

    if (!title.trim()) {
      Alert.alert(
        'Add a title',
        'Name this expense so it remains useful later.',
      );
      return;
    }

    if (
      amount.trim() === '' ||
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0
    ) {
      Alert.alert(
        'Check the amount',
        'Enter an expense amount greater than zero.',
      );
      return;
    }

    if (!/^[A-Z]{3}$/.test(cleanCurrency)) {
      Alert.alert(
        'Check the currency',
        'Use a three-letter currency code such as EUR or JPY.',
      );
      return;
    }

    if (!expenseDate) {
      Alert.alert(
        'Choose a date',
        'Select when this expense happened.',
      );
      return;
    }

    const input = {
      title: title.trim(),
      amount: parsedAmount,
      currencyCode: cleanCurrency,
      category,
      date: expenseDate,
      notes: notes.trim() || undefined,
      bookingId,
      stopId,
    };

    try {
      setIsSaving(true);

      if (editingExpense) {
        await actions.updateExpense(
          editingExpense.id,
          input,
        );
      } else {
        await actions.addExpense(input);
      }

      closeExpense();
    } catch (error) {
      console.error(
        '[Budget] Expense save error:',
        error,
      );
      Alert.alert(
        'Could not save expense',
        'Your existing expense data was not changed. Please try again.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = (
    expense: BudgetItem,
  ) => {
    Alert.alert(
      'Delete expense?',
      `Remove "${expense.title}" from this budget?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await actions.deleteExpense(
                expense.id,
              );
            } catch (error) {
              console.error(
                '[Budget] Expense delete error:',
                error,
              );
              Alert.alert(
                'Could not delete expense',
                'Nothing was removed. Please try again.',
              );
            }
          },
        },
      ],
    );
  };

  const progressWidth = `${Math.min(
    Math.max(summary.progress ?? 0, 0),
    1,
  ) * 100}%` as `${number}%`;

  const canAddExpense =
    workspace.budget !== null &&
    !summary.hasBudgetCurrencyConflict;

  return (
    <>
      <Screen scroll>
        <UtilityScreenHeader
          eyebrow={`TRIP MONEY · ${accountingCurrency}`}
          title="Budget"
          subtitle="Plan your spending and see what’s left."
          leading={(
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to More"
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
              accessibilityLabel="Add expense"
              disabled={!canAddExpense}
              style={[
                styles.addButton,
                !canAddExpense && styles.disabled,
              ]}
              onPress={openCreateExpense}
            >
              <Ionicons
                name="add"
                size={24}
                color={colors.textInverse}
              />
            </Pressable>
          )}
        />

        {summary.hasBudgetCurrencyConflict ? (
          <View style={styles.conflictCard}>
            <Ionicons
              name="warning-outline"
              size={26}
              color={colors.warning}
            />

            <View style={styles.conflictCopy}>
              <Text style={styles.conflictTitle}>
                Budget currency needs review
              </Text>
              <Text style={styles.conflictBody}>
                This budget uses {workspace.budget?.currencyCode}, while the trip budget currency is {accountingCurrency}. The amounts remain unchanged and separate.
              </Text>
            </View>
          </View>
        ) : workspace.budget ? (
          <>
            <View style={styles.summaryCard}>
              <View style={styles.summaryTopRow}>
                <View>
                  <Text style={styles.summaryLabel}>
                    PLANNED BUDGET
                  </Text>
                  <Text style={styles.summaryAmount}>
                    {summary.plannedAmount === null
                      ? 'Not set'
                      : formatMoney(
                          summary.plannedAmount,
                          accountingCurrency,
                        )}
                  </Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Edit planned budget"
                  style={styles.editPlanButton}
                  onPress={openPlan}
                >
                  <Ionicons
                    name="pencil-outline"
                    size={18}
                    color={colors.textInverse}
                  />
                </Pressable>
              </View>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: progressWidth },
                  ]}
                />
              </View>

              <View style={styles.metricsRow}>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>
                    SPENT
                  </Text>
                  <Text style={styles.metricValue}>
                    {formatMoney(
                      summary.spentAmount,
                      accountingCurrency,
                    )}
                  </Text>
                </View>

                <View style={styles.metricDivider} />

                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>
                    {summary.remainingAmount !== null &&
                    summary.remainingAmount < 0
                      ? 'OVER BUDGET'
                      : 'REMAINING'}
                  </Text>
                  <Text style={styles.metricValue}>
                    {summary.remainingAmount === null
                      ? '—'
                      : formatMoney(
                          Math.abs(
                            summary.remainingAmount,
                          ),
                          accountingCurrency,
                        )}
                  </Text>
                </View>
              </View>
            </View>

            {summary.foreignCurrencyTotals.length > 0 && (
              <View style={styles.currencyNotice}>
                <Ionicons
                  name="swap-horizontal-outline"
                  size={24}
                  color={colors.brass}
                />

                <View style={styles.currencyNoticeCopy}>
                  <Text style={styles.currencyNoticeTitle}>
                    Kept outside the {accountingCurrency} total
                  </Text>
                  <Text style={styles.currencyNoticeBody}>
                    These amounts stay in their original currencies and are not included in the trip total.
                  </Text>

                  <View style={styles.currencyPills}>
                    {summary.foreignCurrencyTotals.map(
                      (total) => (
                        <View
                          key={total.currencyCode}
                          style={styles.currencyPill}
                        >
                          <Text style={styles.currencyPillText}>
                            {formatMoney(
                              total.amount,
                              total.currencyCode,
                            )}
                          </Text>
                        </View>
                      ),
                    )}
                  </View>
                </View>
              </View>
            )}

            {summary.convertedCurrencyTotals.length > 0 && (
              <View style={styles.currencyNotice}>
                <Ionicons
                  name="calculator-outline"
                  size={24}
                  color={colors.teal}
                />
                <View style={styles.currencyNoticeCopy}>
                  <Text style={styles.currencyNoticeTitle}>
                    Converted into {accountingCurrency}
                  </Text>
                  <Text style={styles.currencyNoticeBody}>
                    These totals use an explicit traveler rate with an as-of date. They are not live market prices.
                  </Text>
                  <View style={styles.currencyPills}>
                    {summary.convertedCurrencyTotals.map(
                      (total) => (
                        <View
                          key={total.currencyCode}
                          style={styles.currencyPill}
                        >
                          <Text style={styles.currencyPillText}>
                            {formatMoney(
                              total.originalAmount,
                              total.currencyCode,
                            )}{' '}
                            → {formatMoney(
                              total.convertedAmount,
                              accountingCurrency,
                            )}{' '}
                            at {total.rate} on {total.asOf}
                          </Text>
                        </View>
                      ),
                    )}
                  </View>
                </View>
              </View>
            )}

            <View style={styles.currencyNotice}>
              <Ionicons
                name="swap-horizontal-outline"
                size={24}
                color={colors.brass}
              />
              <View style={styles.currencyNoticeCopy}>
                <Text style={styles.currencyNoticeTitle}>
                  Traveler FX rates
                </Text>
                <Text style={styles.currencyNoticeBody}>
                  Foreign paid expenses enter the {accountingCurrency} total only when you save a rate. There is no live FX feed.
                </Text>
                {workspace.fxRates.map((rate) => (
                  <View
                    key={rate.id}
                    style={styles.fxRateRow}
                  >
                    <Text style={styles.fxRateText}>
                      1 {rate.fromCurrency} = {rate.rate} {rate.toCurrency} · {rate.asOf}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${rate.fromCurrency} rate`}
                      onPress={() =>
                        void actions.deleteFxRate(rate.id)
                      }
                    >
                      <Text style={styles.fxRateRemove}>
                        Remove
                      </Text>
                    </Pressable>
                  </View>
                ))}
                <View style={styles.fxRateForm}>
                  <TextInput
                    value={fxFromCurrency}
                    onChangeText={setFxFromCurrency}
                    placeholder="JPY"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    style={styles.fxInput}
                  />
                  <TextInput
                    value={fxRate}
                    onChangeText={setFxRate}
                    placeholder="0.0062"
                    keyboardType="decimal-pad"
                    style={styles.fxInput}
                  />
                  <TextInput
                    value={fxAsOf}
                    onChangeText={setFxAsOf}
                    placeholder="2026-09-03"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.fxInput}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Save FX rate"
                    style={styles.fxSave}
                    onPress={() => {
                      void (async () => {
                        try {
                          await actions.saveFxRate({
                            fromCurrency: fxFromCurrency,
                            rate: Number(
                              fxRate.replace(',', '.'),
                            ),
                            asOf: fxAsOf,
                          });
                          setFxFromCurrency('');
                          setFxRate('');
                          setFxAsOf('');
                        } catch (error) {
                          Alert.alert(
                            'Could not save FX rate',
                            error instanceof Error
                              ? error.message
                              : 'Check the currencies, rate, and as-of date.',
                          );
                        }
                      })();
                    }}
                  >
                    <Text style={styles.fxSaveText}>
                      Save rate
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>

            {summary.notPaidItems.length > 0 && (
              <View style={styles.legacyNotice}>
                <Text style={styles.legacyNoticeText}>
                  {summary.notPaidItems.length} planned or committed {summary.notPaidItems.length === 1 ? 'entry is' : 'entries are'} shown below but not counted as spent.
                </Text>
              </View>
            )}

            <SectionHeader
              eyebrow="WHERE IT WENT"
              title="Categories"
            />

            {summary.categoryTotals.length > 0 ? (
              <View style={styles.categoryCard}>
                {summary.categoryTotals.map(
                  (entry) => {
                    const details =
                      CATEGORY_DETAILS[entry.category];
                    const share =
                      summary.spentAmount > 0
                        ? entry.amount /
                          summary.spentAmount
                        : 0;
                    const width = `${Math.max(
                      share * 100,
                      3,
                    )}%` as `${number}%`;

                    return (
                      <View
                        key={entry.category}
                        style={styles.categoryRow}
                      >
                        <View style={styles.categoryRowTop}>
                          <View style={styles.categoryNameWrap}>
                            <Ionicons
                              name={details.icon}
                              size={18}
                              color={details.color}
                            />
                            <Text style={styles.categoryName}>
                              {details.label}
                            </Text>
                          </View>
                          <Text style={styles.categoryAmount}>
                            {formatMoney(
                              entry.amount,
                              accountingCurrency,
                            )}
                          </Text>
                        </View>

                        <View style={styles.categoryTrack}>
                          <View
                            style={[
                              styles.categoryFill,
                              {
                                width,
                                backgroundColor:
                                  details.color,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    );
                  },
                )}
              </View>
            ) : (
              <Text style={styles.sectionEmptyText}>
                Expenses in {accountingCurrency} will appear here.
              </Text>
            )}

            <SectionHeader
              eyebrow="YOUR RECORD"
              title="Expenses"
              actionLabel="Add expense"
              onAction={openCreateExpense}
            />

            {expenses.length === 0 ? (
              <View style={styles.emptyExpenses}>
                <View style={styles.emptyExpensesTop}>
                  <View style={styles.emptyIcon}>
                    <Ionicons
                      name="receipt-outline"
                      size={21}
                      color={colors.brand}
                    />
                  </View>

                  <View style={styles.emptyExpensesCopy}>
                    <Text style={styles.emptyTitle}>
                      No expenses yet
                    </Text>
                    <Text style={styles.emptyBody}>
                      Add what you spend as the trip takes shape.
                    </Text>
                  </View>
                </View>

                <Pressable
                  style={styles.secondaryActionButton}
                  onPress={openCreateExpense}
                >
                  <Text style={styles.secondaryActionButtonText}>
                    Add expense
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.expenseList}>
                {expenses.map((expense) => (
                  <ExpenseRow
                    key={expense.id}
                    expense={expense}
                    accountingCurrency={
                      accountingCurrency
                    }
                    onPress={() =>
                      openEditExpense(expense)
                    }
                    onDelete={() =>
                      confirmDelete(expense)
                    }
                  />
                ))}
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyBudget}>
            <View style={styles.emptyBudgetTop}>
              <View style={styles.emptyBudgetIcon}>
                <Ionicons
                  name="wallet-outline"
                  size={23}
                  color={colors.brand}
                />
              </View>

              <View style={styles.emptyBudgetCopy}>
                <Text style={styles.emptyBudgetTitle}>
                  Set a budget for this trip
                </Text>
                <Text style={styles.emptyBudgetBody}>
                  Choose how much you want to spend in {accountingCurrency}. Expenses can still use the currency you paid.
                </Text>
              </View>
            </View>

            <View style={styles.emptyBudgetActions}>
              <Pressable
                style={styles.primaryButton}
                onPress={openPlan}
              >
                <Text style={styles.primaryButtonText}>
                  Set budget
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Change trip currency from ${accountingCurrency}`}
                style={styles.currencyTextButton}
                onPress={openTripCurrencySettings}
              >
                <Text style={styles.currencyTextButtonText}>
                  Change {accountingCurrency}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={15}
                  color={colors.brand}
                />
              </Pressable>
            </View>
          </View>
        )}

        <View style={styles.bottomSpace} />
      </Screen>

      <Modal
        visible={planModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() =>
          setPlanModalVisible(false)
        }
      >
        <SafeAreaView style={styles.sheetSafeArea}>
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetEyebrow}>
                {accountingCurrency} · TRIP BUDGET
              </Text>
              <Text style={styles.sheetTitle}>
                Planned amount
              </Text>
            </View>
            <Pressable
              style={styles.closeButton}
              onPress={() =>
                setPlanModalVisible(false)
              }
            >
              <Ionicons
                name="close"
                size={24}
                color={colors.textPrimary}
              />
            </Pressable>
          </View>

          <View style={styles.planSheetContent}>
            <Text style={styles.fieldLabel}>
              PLANNED BUDGET
            </Text>

            <TextInput
              accessibilityLabel="Planned budget amount"
              value={plannedAmount}
              onChangeText={setPlannedAmount}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              style={styles.planMoneyInput}
            />

            <View style={styles.tripCurrencyRow}>
              <View style={styles.tripCurrencyCopy}>
                <Text style={styles.tripCurrencyLabel}>
                  TRIP CURRENCY
                </Text>
                <Text style={styles.tripCurrencyValue}>
                  {accountingCurrency}
                </Text>
              </View>

              {workspace.budget ? (
                <View style={styles.currencyLockedPill}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={14}
                    color={colors.textMuted}
                  />
                  <Text style={styles.currencyLockedText}>
                    Locked
                  </Text>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Change trip currency from ${accountingCurrency}`}
                  style={styles.currencyChangeButton}
                  onPress={openTripCurrencySettings}
                >
                  <Text style={styles.currencyChangeButtonText}>
                    Change
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={15}
                    color={colors.brand}
                  />
                </Pressable>
              )}
            </View>

            <Text style={styles.fieldHelp}>
              {workspace.budget
                ? 'The trip currency is locked while saved budget data exists.'
                : 'Set the trip currency before saving your first budget. Expenses can still use the currency you paid.'}
            </Text>

            <Pressable
              disabled={isSaving}
              style={[
                styles.sheetSaveButton,
                isSaving && styles.disabled,
              ]}
              onPress={() => void savePlannedBudget()}
            >
              <Text style={styles.sheetSaveButtonText}>
                {isSaving ? 'Saving…' : 'Save budget'}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={expenseModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeExpense}
      >
        <SafeAreaView style={styles.sheetSafeArea}>
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetEyebrow}>
                ACTUAL EXPENSE
              </Text>
              <Text style={styles.sheetTitle}>
                {editingExpense
                  ? 'Edit expense'
                  : 'Add expense'}
              </Text>
            </View>
            <Pressable
              style={styles.closeButton}
              onPress={closeExpense}
            >
              <Ionicons
                name="close"
                size={24}
                color={colors.textPrimary}
              />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.sheetContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Field
              label="TITLE"
              value={title}
              onChangeText={setTitle}
              placeholder="Dinner by the harbour"
            />

            <View style={styles.fieldRow}>
              <View style={styles.amountField}>
                <Field
                  label="AMOUNT"
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.currencyField}>
                <Field
                  label="CURRENCY"
                  value={currency}
                  onChangeText={setCurrency}
                  placeholder={accountingCurrency}
                  autoCapitalize="characters"
                  maxLength={3}
                />
              </View>
            </View>

            <Text style={styles.fieldHelpInline}>
              Use the currency you actually paid.
            </Text>

            <Text style={styles.fieldLabel}>
              CATEGORY
            </Text>
            <View style={styles.choiceWrap}>
              {BUDGET_CATEGORIES.map((value) => {
                const details =
                  CATEGORY_DETAILS[value];
                const selected = category === value;
                return (
                  <Pressable
                    key={value}
                    style={[
                      styles.choiceChip,
                      selected &&
                        styles.choiceChipSelected,
                    ]}
                    onPress={() => setCategory(value)}
                  >
                    <Ionicons
                      name={details.icon}
                      size={16}
                      color={
                        selected
                          ? colors.textInverse
                          : colors.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.choiceChipText,
                        selected &&
                          styles.choiceChipTextSelected,
                      ]}
                    >
                      {details.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>
              DATE
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Choose expense date"
              style={styles.dateButton}
              onPress={openDatePicker}
            >
              <Ionicons
                name="calendar-outline"
                size={20}
                color={colors.brand}
              />
              <Text
                style={[
                  styles.dateButtonText,
                  !expenseDate && styles.placeholderText,
                ]}
              >
                {expenseDate
                  ? formatDate(expenseDate)
                  : 'Choose expense date'}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textMuted}
              />
            </Pressable>

            {Platform.OS !== 'android' &&
              showIOSDatePicker && (
                <DateTimePicker
                  value={fromDateKey(expenseDate)}
                  mode="date"
                  display="inline"
                  onChange={handleDateChange}
                />
              )}

            <LinkChoices
              label="BOOKING"
              emptyLabel="No booking link"
              selectedId={bookingId}
              choices={workspace.bookings.map(
                (booking) => ({
                  id: booking.id,
                  label: booking.title,
                }),
              )}
              onSelect={setBookingId}
            />

            <LinkChoices
              label="ITINERARY STOP"
              emptyLabel="No stop link"
              selectedId={stopId}
              choices={workspace.stops.map((stop) => ({
                id: stop.id,
                label: stop.title,
              }))}
              onSelect={setStopId}
            />

            <Field
              label="NOTES"
              value={notes}
              onChangeText={setNotes}
              placeholder="Optional context, receipt details or who paid…"
              multiline
            />

            <Pressable
              disabled={isSaving}
              style={[
                styles.sheetSaveButton,
                isSaving && styles.disabled,
              ]}
              onPress={() => void saveExpense()}
            >
              <Text style={styles.sheetSaveButtonText}>
                {isSaving
                  ? 'Saving…'
                  : editingExpense
                    ? 'Save changes'
                    : 'Add expense'}
              </Text>
            </Pressable>

            <View style={styles.sheetBottomSpace} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

function SectionHeader({
  eyebrow,
  title,
  actionLabel,
  onAction,
}: {
  eyebrow: string;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View>
        <Text style={styles.sectionEyebrow}>
          {eyebrow}
        </Text>
        <Text style={styles.sectionTitle}>
          {title}
        </Text>
      </View>
      {actionLabel && onAction && (
        <Pressable onPress={onAction}>
          <Text style={styles.sectionAction}>
            {actionLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function ExpenseRow({
  expense,
  accountingCurrency,
  onPress,
  onDelete,
}: {
  expense: BudgetItem;
  accountingCurrency: string;
  onPress: () => void;
  onDelete: () => void;
}) {
  const details =
    CATEGORY_DETAILS[expense.category];
  const isForeign =
    normalizeCurrencyCode(expense.currencyCode) !==
    accountingCurrency;

  return (
    <View style={styles.expenseCard}>
      <Pressable
        style={styles.expenseMain}
        onPress={onPress}
      >
        <View
          style={[
            styles.expenseIcon,
            {
              backgroundColor: `${details.color}18`,
            },
          ]}
        >
          <Ionicons
            name={details.icon}
            size={20}
            color={details.color}
          />
        </View>

        <View style={styles.expenseCopy}>
          <Text style={styles.expenseTitle}>
            {expense.title}
          </Text>
          <Text style={styles.expenseMeta}>
            {formatDate(expense.date)} · {details.label}
          </Text>
          <View style={styles.expenseFlags}>
            {isForeign && expense.status === 'paid' && (
              <View style={styles.foreignBadge}>
                <Text style={styles.foreignBadgeText}>
                  OUTSIDE {accountingCurrency} TOTAL
                </Text>
              </View>
            )}
            {expense.status !== 'paid' && (
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>
                  {expense.status.toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.expenseAmountWrap}>
          <Text style={styles.expenseAmount}>
            {formatMoney(
              expense.amount,
              expense.currencyCode,
            )}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={colors.textMuted}
          />
        </View>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Delete ${expense.title}`}
        style={styles.deleteButton}
        onPress={onDelete}
      >
        <Ionicons
          name="trash-outline"
          size={18}
          color={colors.danger}
        />
      </Pressable>
    </View>
  );
}

function LinkChoices({
  label,
  emptyLabel,
  selectedId,
  choices,
  onSelect,
}: {
  label: string;
  emptyLabel: string;
  selectedId?: string;
  choices: { id: string; label: string }[];
  onSelect: (id: string | undefined) => void;
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>
        {label}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.linkChoices}
      >
        <Pressable
          style={[
            styles.linkChip,
            !selectedId && styles.linkChipSelected,
          ]}
          onPress={() => onSelect(undefined)}
        >
          <Text
            style={[
              styles.linkChipText,
              !selectedId &&
                styles.linkChipTextSelected,
            ]}
          >
            {emptyLabel}
          </Text>
        </Pressable>
        {choices.map((choice) => {
          const selected = selectedId === choice.id;
          return (
            <Pressable
              key={choice.id}
              style={[
                styles.linkChip,
                selected && styles.linkChipSelected,
              ]}
              onPress={() => onSelect(choice.id)}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.linkChipText,
                  selected &&
                    styles.linkChipTextSelected,
                ]}
              >
                {choice.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  maxLength,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'decimal-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  maxLength?: number;
  multiline?: boolean;
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        maxLength={maxLength}
        multiline={multiline}
        style={[
          styles.input,
          multiline && styles.multilineInput,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand,
  },
  summaryCard: {
    padding: spacing[5],
    borderRadius: radius.lg,
    backgroundColor: colors.brand,
    ...shadows.card,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summaryLabel: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.5,
    color: colors.brass,
  },
  summaryAmount: {
    marginTop: spacing[1],
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.title,
    lineHeight: lineHeight.title,
    color: colors.textInverse,
  },
  editPlanButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  progressTrack: {
    height: 7,
    marginTop: spacing[5],
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.brass,
  },
  metricsRow: {
    flexDirection: 'row',
    marginTop: spacing[4],
  },
  metric: { flex: 1 },
  metricDivider: {
    width: 1,
    marginHorizontal: spacing[5],
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  metricLabel: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.55)',
  },
  metricValue: {
    marginTop: spacing[1],
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodyLarge,
    color: colors.textInverse,
  },
  currencyNotice: {
    flexDirection: 'row',
    gap: spacing[4],
    marginTop: spacing[4],
    padding: spacing[5],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.brassSoft,
    backgroundColor: colors.surfaceWarm,
  },
  currencyNoticeCopy: { flex: 1 },
  currencyNoticeTitle: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textPrimary,
  },
  currencyNoticeBody: {
    marginTop: spacing[2],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textSecondary,
  },
  currencyPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[3],
  },
  currencyPill: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.pill,
    backgroundColor: colors.brassSoft,
  },
  currencyPillText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.caption,
    color: colors.textPrimary,
  },
  fxRateRow: {
    marginTop: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  fxRateText: {
    flex: 1,
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.caption,
    color: colors.textPrimary,
  },
  fxRateRemove: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.caption,
    color: colors.coral,
  },
  fxRateForm: {
    marginTop: spacing[3],
    gap: spacing[2],
  },
  fxInput: {
    minHeight: 44,
    paddingHorizontal: spacing[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  fxSave: {
    minHeight: 44,
    marginTop: spacing[1],
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand,
  },
  fxSaveText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textInverse,
  },
  legacyNotice: {
    marginTop: spacing[3],
    padding: spacing[4],
    borderRadius: radius.md,
    backgroundColor: colors.backgroundSoft,
  },
  legacyNoticeText: {
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textSecondary,
  },
  conflictCard: {
    flexDirection: 'row',
    gap: spacing[4],
    padding: spacing[6],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.brassSoft,
    backgroundColor: colors.surface,
  },
  conflictCopy: { flex: 1 },
  conflictTitle: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleSmall,
    lineHeight: lineHeight.titleSmall,
    color: colors.textPrimary,
  },
  conflictBody: {
    marginTop: spacing[2],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodySmall,
    color: colors.textSecondary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: spacing[7],
    marginBottom: spacing[3],
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
    fontSize: fontSize.title,
    lineHeight: lineHeight.title,
    color: colors.textPrimary,
  },
  sectionAction: {
    paddingVertical: spacing[2],
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.brand,
  },
  categoryCard: {
    paddingHorizontal: spacing[5],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  categoryRow: {
    paddingVertical: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  categoryRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryNameWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  categoryName: {
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.bodySmall,
    color: colors.textPrimary,
  },
  categoryAmount: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textPrimary,
  },
  categoryTrack: {
    height: 5,
    marginTop: spacing[3],
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: colors.backgroundSoft,
  },
  categoryFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  sectionEmptyText: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodySmall,
    color: colors.textMuted,
  },
  emptyBudget: {
    padding: spacing[5],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  emptyBudgetTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  emptyBudgetIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandSoft,
  },
  emptyBudgetCopy: {
    flex: 1,
  },
  emptyBudgetTitle: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleSmall,
    lineHeight: lineHeight.titleSmall,
    color: colors.textPrimary,
  },
  emptyBudgetBody: {
    marginTop: spacing[1],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodySmall,
    color: colors.textSecondary,
  },
  emptyExpenses: {
    padding: spacing[4],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  emptyExpensesTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  emptyExpensesCopy: {
    flex: 1,
  },
  emptyIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandSoft,
  },
  emptyTitle: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textPrimary,
  },
  emptyBody: {
    marginTop: spacing[1],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textMuted,
  },
  primaryButton: {
    minHeight: 46,
    marginTop: spacing[4],
    paddingHorizontal: spacing[5],
    borderRadius: radius.md,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand,
  },
  primaryButtonText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textInverse,
  },
  emptyBudgetActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  currencyTextButton: {
    minHeight: 42,
    marginTop: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
  },
  currencyTextButtonText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.caption,
    color: colors.brand,
  },
  secondaryActionButton: {
    minHeight: 42,
    marginTop: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: radius.md,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandSoft,
  },
  secondaryActionButtonText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.caption,
    color: colors.brand,
  },
  expenseList: { gap: spacing[3] },
  expenseCard: {
    overflow: 'hidden',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  expenseMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
  },
  expenseIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  expenseCopy: { flex: 1 },
  expenseTitle: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textPrimary,
  },
  expenseMeta: {
    marginTop: spacing[1],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  expenseFlags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1],
    marginTop: spacing[2],
  },
  foreignBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.brassSoft,
  },
  foreignBadgeText: {
    fontFamily: fontFamily.sansBold,
    fontSize: 9,
    letterSpacing: 0.5,
    color: colors.warning,
  },
  statusBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.backgroundSoft,
  },
  statusBadgeText: {
    fontFamily: fontFamily.sansBold,
    fontSize: 9,
    letterSpacing: 0.5,
    color: colors.textSecondary,
  },
  expenseAmountWrap: {
    alignItems: 'flex-end',
    gap: spacing[1],
    marginLeft: spacing[2],
  },
  expenseAmount: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textPrimary,
  },
  deleteButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceWarm,
  },
  sheetSafeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[5],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  sheetEyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.4,
    color: colors.brass,
  },
  sheetTitle: {
    marginTop: spacing[1],
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.title,
    color: colors.textPrimary,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundSoft,
  },
  planSheetContent: {
    padding: spacing[6],
  },
  sheetContent: {
    padding: spacing[6],
  },
  fieldBlock: {
    marginBottom: spacing[5],
  },
  fieldLabel: {
    marginBottom: spacing[2],
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.4,
    color: colors.textSecondary,
  },
  input: {
    minHeight: 54,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.body,
    color: colors.textPrimary,
  },
  multilineInput: {
    minHeight: 116,
    textAlignVertical: 'top',
  },
  fieldRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  amountField: { flex: 1.8 },
  currencyField: { flex: 1 },
  fieldHelpInline: {
    marginTop: -spacing[3],
    marginBottom: spacing[5],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textMuted,
  },
  planMoneyInput: {
    minHeight: 64,
    paddingHorizontal: spacing[4],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.title,
    color: colors.textPrimary,
  },
  tripCurrencyRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
    marginTop: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceWarm,
  },
  tripCurrencyCopy: {
    flex: 1,
  },
  tripCurrencyLabel: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.2,
    color: colors.textMuted,
  },
  tripCurrencyValue: {
    marginTop: 2,
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textPrimary,
  },
  currencyChangeButton: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
  },
  currencyChangeButtonText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.caption,
    color: colors.brand,
  },
  currencyLockedPill: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    borderRadius: radius.pill,
    backgroundColor: colors.backgroundSoft,
  },
  currencyLockedText: {
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  fieldHelp: {
    marginTop: spacing[3],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textMuted,
  },
  choiceWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[5],
  },
  choiceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  choiceChipSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.brand,
  },
  choiceChipText: {
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.caption,
    color: colors.textSecondary,
  },
  choiceChipTextSelected: {
    color: colors.textInverse,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    minHeight: 56,
    marginBottom: spacing[5],
    paddingHorizontal: spacing[4],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  dateButtonText: {
    flex: 1,
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.bodySmall,
    color: colors.textPrimary,
  },
  placeholderText: { color: colors.textMuted },
  linkChoices: {
    gap: spacing[2],
    paddingRight: spacing[4],
  },
  linkChip: {
    maxWidth: 220,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  linkChipSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  linkChipText: {
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.caption,
    color: colors.textSecondary,
  },
  linkChipTextSelected: { color: colors.brand },
  sheetSaveButton: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.brand,
  },
  sheetSaveButtonText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.body,
    color: colors.textInverse,
  },
  disabled: { opacity: 0.45 },
  bottomSpace: { height: spacing[12] },
  sheetBottomSpace: { height: spacing[10] },
});
