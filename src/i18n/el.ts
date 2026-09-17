/**
 * Greek copy catalogue.
 *
 * Every traveller-facing string lives here so the wording can be reviewed in
 * one place and a second locale stays possible. This supersedes the earlier
 * "copy stays English in V1" decision recorded in locale-format.ts.
 *
 * Not for: log messages, AI prompts, provider payloads, canonical domain
 * values, or anything a machine reads.
 */
export const el = {
  tabs: {
    home: 'Αρχική',
    trips: 'Ταξίδια',
    discover: 'Ανακάλυψε',
    world: 'Κόσμος',
    profile: 'Προφίλ',
  },

  tripTabs: {
    companion: 'Συνοδός',
    plan: 'Πρόγραμμα',
    map: 'Χάρτης',
    bookings: 'Κρατήσεις',
    more: 'Περισσότερα',
  },

  home: {
    heroOnJourney: 'Είσαι στο ταξίδι.',
    heroUpcoming: 'Το επόμενο ταξίδι σου περιμένει.',
    heroNoDestination: 'Δεν έχει οριστεί προορισμός',
    heroOpenCompanion: 'Άνοιξε τον Συνοδό',
    heroContinuePlanning: 'Συνέχισε τον σχεδιασμό',
    copilotDoorTitle: 'Συνοδός ταξιδιού',
    readinessEyebrow: 'ΠΡΙΝ ΦΥΓΕΙΣ',
    readinessTitle: 'Ετοιμότητα ταξιδιού',
    tripsEyebrow: 'ΤΑΞΙΔΙΑ',
    tripsTitle: 'Πρόσφατα',
    tripsSeeAll: 'Δες όλα',
    tripsSeeAllLabel: 'Δες όλα τα ταξίδια',
    exploreEyebrow: 'ΕΞΕΡΕΥΝΗΣΕ',
    exploreTitle: 'Περισσότερες πόρτες',
    discoverTitle: 'Ανακάλυψε',
    discoverLabel: 'Άνοιξε το Ανακάλυψε',
    chatLabel: 'Ρώτα το TravelOS',
    openProfile: 'Άνοιξε το προφίλ',
    openCopilot: 'Άνοιξε τον Συνοδό ταξιδιού',
    helpMeDecideChat: 'Βοήθησέ με να αποφασίσω με το TravelOS chat',
    createTrip: 'Δημιούργησε ταξίδι',
    importBookings: 'Εισαγωγή κρατήσεων ή αρχείων',
    browseDiscover: 'Περιήγηση στον κατάλογο Ανακάλυψε',
    openTrips: 'Άνοιξε τα ταξίδια',
    openWorld: 'Άνοιξε τον Κόσμο',
    continueOrganize: 'Συνέχεια στη διαδρομή οργάνωσης',
    openTravelChat: 'Άνοιξε το Travel Chat τώρα',
    finishCoach: 'Τέλος της πρώτης ξενάγησης',
    createTripNow: 'Δημιούργησε ταξίδι τώρα',
  },

  tripIntent: {
    relax: 'Χαλάρωση',
    explore: 'Εξερεύνηση',
    food: 'Φαγητό',
    nature: 'Φύση',
    event: 'Εκδήλωση',
    social: 'Παρέα',
    romantic: 'Ρομαντικό',
    family: 'Οικογένεια',
    work_leisure: 'Δουλειά + ξεκούραση',
    other: 'Άλλο',
  },

  tripPace: {
    slowLabel: 'Χαλαρό',
    slowDescription: 'Περισσότερος χώρος να ανασάνεις.',
    balancedLabel: 'Ισορροπημένο',
    balancedDescription: 'Μείγμα από πλάνο και ελεύθερο χρόνο.',
    fullLabel: 'Γεμάτο',
    fullDescription: 'Αξιοποίησε κάθε μέρα στο έπακρο.',
  },

  tripParty: {
    solo: 'Μόνος/η',
    couple: 'Ζευγάρι',
    friends: 'Φίλοι',
    family: 'Οικογένεια',
  },

  picker: {
    destinationPrompt: 'ΠΟΥ ΠΑΣ;',
    destinationPlaceholder: 'Διάλεξε πόλη, περιοχή ή χώρα',
    destinationChoose: 'Διάλεξε προορισμό',
    destinationAdd: 'Πρόσθεσε προορισμό',
    destinationReplace: 'Άλλαξε σημείο στον χάρτη',
    destinationDone: 'Χρήση προορισμού',
    destinationHelp:
      'Πρόσθεσε πραγματικό σημείο για να μπει ο προορισμός στον χάρτη του ταξιδιού.',
    destinationSaveFailed:
      'Το σημείο δεν αποθηκεύτηκε. Ο προορισμός σου παραμένει ίδιος.',

    originPrompt: 'ΑΠΟ ΠΟΥ ΦΕΥΓΕΙΣ;',
    originPlaceholder: 'Διάλεξε τον τόπο από όπου ταξιδεύεις',
    originChoose: 'Διάλεξε αφετηρία',
    originAdd: 'Πρόσθεσε αφετηρία',
    originReplace: 'Άλλαξε σημείο αφετηρίας',
    originDone: 'Χρήση αφετηρίας',
    originHelp:
      'Πρόσθεσε πραγματικό σημείο για να μείνει η αφετηρία στον χάρτη. Παραμένει μόνο στοιχείο του picker.',
    originSaveFailed:
      'Το σημείο δεν αποθηκεύτηκε. Η αφετηρία σου παραμένει ίδια.',

    addMap: 'Πρόσθεσε σημείο στον χάρτη',
    searchPlaceholder: 'Αναζήτηση πόλεων, περιοχών ή χωρών…',
    cancel: 'Άκυρο',
    openingMap: 'Άνοιγμα χάρτη…',
    mapLocationLabel: 'ΣΗΜΕΙΟ ΣΤΟΝ ΧΑΡΤΗ',
    mapSaved: 'Το σημείο αποθηκεύτηκε',
    mapNotAdded: 'Δεν έχει προστεθεί σημείο',
    timezoneLabel: 'ΖΩΝΗ ΩΡΑΣ',
    timezoneUnknown: 'Άγνωστη',
    timezoneNotGuessed: 'Δεν μαντεύεται από την πινέζα',
    timezoneChange: 'Αλλαγή',
    timezoneSet: 'Όρισε',
    timezoneSetLabel: 'Όρισε ζώνη ώρας',
    timezoneSheetTitle: 'Ζώνη ώρας πόλης',
    timezoneSheetBody:
      'Χρησιμοποίησε πραγματική ζώνη IANA. Το TravelOS δεν μαντεύει ζώνη από συντεταγμένες.',
    timezoneClear: 'Καθάρισε',
    timezoneSave: 'Αποθήκευση',
    timezoneSaveLabel: 'Αποθήκευση ζώνης ώρας',
    timezoneClearLabel: 'Καθάρισε ζώνη ώρας',
    timezoneInvalidTitle: 'Μη αναγνωρίσιμη ζώνη ώρας',
    timezoneInvalidBody:
      'Δώσε έγκυρη ζώνη IANA, όπως Europe/Athens.',
    sourceProvider: 'Από τον πάροχο χάρτη',
    sourceCatalogue: 'Από τον κατάλογο',
    sourceTraveler: 'Ορισμένη από εσένα',
    sourceSaved: 'Αποθηκευμένη ζώνη',
  },

  locationNotice: {
    dismissedTitle: 'Δεν αποθηκεύτηκε σημείο',
    dismissedBody:
      'Έκλεισες τον χάρτη χωρίς να διαλέξεις τόπο, οπότε δεν άλλαξε τίποτα.',
    dismissedHint:
      'Αν η αναζήτηση έμεινε άδεια ενώ πληκτρολογούσες, η αναζήτηση τόπων μπορεί να μην είναι διαθέσιμη σε αυτό το build. Το TravelOS δεν θα μαντέψει σημείο για σένα.',
    unavailableTitle: 'Ο χάρτης δεν άνοιξε',
    retry: 'Άνοιξε ξανά τον χάρτη',
    retryLabel: 'Άνοιξε ξανά τον χάρτη',
    dismissLabel: 'Κλείσε το μήνυμα σημείου',
    pickerUnavailable:
      'Ο χάρτης δεν μπόρεσε να ανοίξει. Δεν άλλαξε τίποτα.',
  },

  newTrip: {
    header: 'Νέο ταξίδι',
    back: 'Πίσω',

    stepWhereEyebrow: 'ΒΗΜΑ 1 · ΠΟΥ',
    howToStart: 'ΠΩΣ ΘΕΛΕΙΣ ΝΑ ΞΕΚΙΝΗΣΕΙΣ',
    destinationLabel: 'ΠΡΟΟΡΙΣΜΟΣ',
    destinationLabelNumbered: (index: number) => `ΠΡΟΟΡΙΣΜΟΣ ${index}`,
    stepWhereTitle: 'Ξεκίνα από κάπου.',
    stepWhereSubtitle:
      'Διάλεξε έναν ή περισσότερους πραγματικούς τόπους. Τίποτα δεν γίνεται ταξίδι πριν το δημιουργήσεις.',
    stepWhenEyebrow: 'ΒΗΜΑ 2 · ΠΟΤΕ',
    stepWhenTitle: 'Διάλεξε τις ημερομηνίες.',
    stepWhenSubtitle:
      'Το TravelOS φτιάχνει τις μέρες από αυτές τις ημερομηνίες. Μπορείς να προσαρμόσεις το πρόγραμμα μετά.',
    stepFinishEyebrow: 'ΒΗΜΑ 3 · ΜΟΡΦΗ',
    stepFinishTitle: 'Κάν’ το δικό σου.',
    stepFinishSubtitle:
      'Προαιρετικά πρόθεση, ρυθμός, προϋπολογισμός, όνομα και το νόμισμα για τα σύνολα του ταξιδιού.',

    prefillTitle: 'Κάν’ το ταξίδι.',
    prefillSubtitle:
      'Η επιλογή σου από το Ανακάλυψε είναι έτοιμη. Έλεγξε τους προορισμούς και συνέχισε.',
    prefillOne: 'Προορισμός προσυμπληρωμένος',
    prefillMany: 'Προορισμοί προσυμπληρωμένοι',
    prefillNote:
      'Δεν έχει δημιουργηθεί τίποτα ακόμα. Συνέχισε μόνο όταν οι τόποι φαίνονται σωστοί.',

    helpMeDecide: 'Βοήθησέ με να αποφασίσω',
    helpMeDecideLabel: 'Βοήθησέ με να αποφασίσω πού να πάω',
    helpMeDecideBody:
      'Άνοιξε το Ανακάλυψε με το brief σου. Grounded τόποι μπορούν να επιστρέψουν εδώ ως προσυμπλήρωση — τίποτα δεν αποθηκεύεται πριν το επιβεβαιώσεις.',
    orPickKnown: 'Ή διάλεξε έναν τόπο που ήδη ξέρεις',

    originEyebrow: 'ΑΦΕΤΗΡΙΑ · ΠΡΟΑΙΡΕΤΙΚΟ',
    originLabel: 'ΑΝΑΧΩΡΗΣΗ ΑΠΟ',
    originHelper:
      'Από πού φεύγεις. Μόνο στοιχεία του picker — δεν είναι προορισμός αυτού του ταξιδιού και δεν χρησιμοποιείται ποτέ ως ρολόι της ημέρας.',
    originClear: 'Καθάρισε αφετηρία',

    travelDates: 'Ημερομηνίες ταξιδιού',
    startDate: 'ΗΜΕΡΟΜΗΝΙΑ ΕΝΑΡΞΗΣ',
    endDate: 'ΗΜΕΡΟΜΗΝΙΑ ΛΗΞΗΣ',
    datesIncomplete: 'Ημερομηνίες ελλιπείς',

    readyToCreate: 'ΕΤΟΙΜΟ ΓΙΑ ΔΗΜΙΟΥΡΓΙΑ',
    shapeEyebrow: 'ΓΙΑΤΙ ΑΥΤΟ ΤΟ ΤΑΞΙΔΙ',
    shapeTitle: 'Δώσε μορφή στο ταξίδι',
    shapeBody:
      'Προαιρετικό. Διάλεξε τι μετράει περισσότερο για αυτό το ταξίδι και πόσο γεμάτες θέλεις τις μέρες.',
    partyNote:
      'Μόνο για τον σχεδιασμό. Δεν δημιουργεί προφίλ ταξιδιωτών.',
    tripDetails: 'Στοιχεία ταξιδιού',
    currencyNote:
      'Χρησιμοποιείται για τον προϋπολογισμό και τα σύνολα του ταξιδιού. Τα έξοδα μπορούν να κρατήσουν το νόμισμα που πλήρωσες.',
    budgetNote:
      'Αποθηκεύεται μόνο αν βάλεις ποσό με το νόμισμα του ταξιδιού παραπάνω. Άφησέ το κενό για να το παραλείψεις.',
    namePlaceholder: 'Δώσε ένα όνομα σε αυτό το ταξίδι',
    defaultTripName: 'Νέο ταξίδι',
    partySizePlaceholder: 'π.χ. 2',
    currencyPlaceholder: 'EUR',
    budgetPlaceholder: 'π.χ. 1200',

    continue: 'Συνέχεια',
    createTrip: 'Δημιουργία ταξιδιού',
    creatingTrip: 'Δημιουργία ταξιδιού…',
    needDestination: 'Διάλεξε προορισμό για να συνεχίσεις',
    needDates: 'Διάλεξε ημερομηνία έναρξης και λήξης για να συνεχίσεις.',
    orHelpMeDecide: 'ή Βοήθησέ με να αποφασίσω',

    alertDestinationNeededTitle: 'Χρειάζεται προορισμός',
    alertDestinationNeededBody:
      'Διάλεξε τουλάχιστον έναν τόπο για να συνεχίσεις.',
    alertDatesNeededTitle: 'Χρειάζονται ημερομηνίες',
    alertDatesNeededBody:
      'Διάλεξε ημερομηνία έναρξης και λήξης για να συνεχίσεις.',
    alertDestinationLimitTitle: 'Όριο προορισμών',
    alertKeepOneTitle: 'Κράτα έναν προορισμό',
    alertRemoveDestinationBody:
      'Αυτό αφαιρεί μόνο τον τόπο από το νέο ταξίδι. Δεν έχει αποθηκευτεί τίποτα ακόμα.',
    remove: 'Αφαίρεση',
    alertChooseDestinationTitle: 'Διάλεξε προορισμό',
    alertChooseDestinationBody:
      'Διάλεξε πόλη, περιοχή ή χώρα πριν δημιουργήσεις αυτό το ταξίδι.',
    alertPartySizeTitle: 'Έλεγξε τον αριθμό ατόμων',
    alertPartySizeBody:
      'Ο αριθμός ατόμων πρέπει να είναι ακέραιος από 1 έως 99, ή άφησέ τον κενό.',
    alertTripDetailsTitle: 'Έλεγξε τα στοιχεία του ταξιδιού',
    alertTripDetailsBody:
      'Έλεγξε τον προορισμό, τις ημερομηνίες και το νόμισμα του ταξιδιού.',
    alertTripCreatedTitle: 'Το ταξίδι δημιουργήθηκε',
    alertBudgetNotSetBody:
      'Το ταξίδι αποθηκεύτηκε, αλλά ο προϋπολογισμός δεν ορίστηκε. Άνοιξε τον Προϋπολογισμό για να βάλεις ποσό μηδέν ή μεγαλύτερο.',
    alertBudgetFailedBody:
      'Το ταξίδι αποθηκεύτηκε, αλλά ο προϋπολογισμός δεν γράφτηκε. Μπορείς να τον ορίσεις στον Προϋπολογισμό.',
    alertCreateFailedTitle: 'Δεν ήταν δυνατή η δημιουργία',
    alertCreateFailedBody:
      'Το TravelOS δεν μπόρεσε να αποθηκεύσει αυτό το ταξίδι. Δοκίμασε ξανά.',
  },

  tripStatus: {
    draft: 'ΠΡΟΧΕΙΡΟ',
    planned: 'ΣΧΕΔΙΑΣΜΕΝΟ',
    active: 'ΣΕ ΕΞΕΛΙΞΗ',
    completed: 'ΟΛΟΚΛΗΡΩΜΕΝΟ',
    archived: 'ΣΤΟ ΑΡΧΕΙΟ',
  },

  trips: {
    eyebrow: 'ΤΑ ΤΑΞΙΔΙΑ ΣΟΥ',
    title: 'Ταξίδια',
    subtitle:
      'Κάθε ταξίδι που σχεδιάζεις, ζεις ή θυμάσαι.',
    importCalendar: 'Εισαγωγή ημερολογίου για έλεγχο',
    emptyTitle: 'Σχεδίασε το πρώτο σου ταξίδι',
    emptyBody:
      'Διάλεξε προορισμό και ημερομηνίες. Το TravelOS κρατάει τα υπόλοιπα μαζί καθώς το ταξίδι παίρνει μορφή.',
    emptyAction: 'Σχεδίασε ταξίδι',
    sectionPlanning: 'ΣΧΕΔΙΑΣΜΟΣ',
    sectionCompleted: 'ΟΛΟΚΛΗΡΩΜΕΝΑ',
    sectionArchived: 'ΑΡΧΕΙΟ',
    addTripLabel: 'Σχεδίασε νέο ταξίδι',
    importCalendarLabel: 'Εισαγωγή ημερολογίου',
    tripCount: (count: number) =>
      count === 1 ? '1 ταξίδι' : `${count} ταξίδια`,
  },
} as const;
