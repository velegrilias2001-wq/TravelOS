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

  stopType: {
    place: 'Τόπος',
    activity: 'Δραστηριότητα',
    food: 'Φαγητό',
    transport: 'Μετακίνηση',
  },

  plan: {
    title: 'Το πρόγραμμά σου',
    summary: (days: number, moments: number) =>
      `${days} ${days === 1 ? 'μέρα' : 'μέρες'} · ${moments} ${
        moments === 1 ? 'στιγμή' : 'στιγμές'
      }`,
    notSet: 'Δεν ορίστηκε',
    done: 'Έγινε',
    skipped: 'Παραλείφθηκε',
    mapped: 'Στον χάρτη',
    moment: 'Στιγμή',
    dayNumber: 'ΜΕΡΑ',
    timeConflict: 'ΣΥΓΚΡΟΥΣΗ ΩΡΑΣ',
    openLinkedBookings: 'Άνοιξε συνδεδεμένες κρατήσεις',

    freeTime: 'ΕΛΕΥΘΕΡΟΣ ΧΡΟΝΟΣ',
    travelosIdeas: 'ΙΔΕΕΣ TRAVELOS',
    ideasOnly: 'Μόνο ιδέες · δεν προστέθηκε τίποτα στο πρόγραμμά σου.',
    ideasProvenance: '. Μένουν ιδέες. Τίποτα δεν αποθηκεύεται ως στάση.',
    thinking: 'Σκέφτεται…',
    refreshIdeas: 'Ανανέωσε ιδέες',
    fillThisTime: 'Γέμισε αυτόν τον χρόνο',
    askFreeTime: (from: string, to: string) =>
      `Ρώτα το TravelOS πώς να αξιοποιήσεις τον ελεύθερο χρόνο από ${from} έως ${to}`,

    assistLabel: 'Προτάσεις Plan Assist για αυτή τη μέρα',
    seedDay: 'Ξεκίνα αυτή τη μέρα',
    seedCity: (city: string) => `Ξεκίνα ${city}`,
    assistBody:
      'Μόνο θεματικές στιγμές — χωρίς επινοημένα μέρη. Το Accept αποθηκεύει πραγματική στάση· μπορείς να προσθέσεις τόπο αργότερα.',
    addManually: 'Πρόσθεσε στιγμή χειροκίνητα',

    editorEdit: 'Επεξεργασία στιγμής',
    editorAddImported: 'Πρόσθεσε εισαγόμενη στιγμή',
    editorAdd: 'Πρόσθεσε στιγμή',
    editorClose: 'Κλείσε τον επεξεργαστή στιγμής',
    skippedNote:
      'Σημειωμένο ως παραλειφθέν στον Συνοδό. Η αλλαγή ώρας επεξεργάζεται το αποθηκευμένο πρόγραμμα, όχι αυτή τη σήμανση.',
    namePlaceholder: 'Μουσείο, δείπνο, ναός…',
    changeLocation: 'Άλλαξε σημείο',
    chooseLocation: 'Διάλεξε σημείο',
    saving: 'Αποθήκευση…',
    saveChanges: 'Αποθήκευση αλλαγών',
    addMoment: 'Πρόσθεσε στιγμή',
    selectedLocation: 'Επιλεγμένο σημείο',
    pickerTitle: 'Διάλεξε σημείο',
    pickerDone: 'Χρήση σημείου',
    pickerSearch: 'Αναζήτηση τόπων ή διευθύνσεων…',

    discardTitle: 'Απόρριψη μη αποθηκευμένων αλλαγών;',
    discardBody:
      'Οι αλλαγές σου δεν έχουν αποθηκευτεί. Συνέχισε την επεξεργασία ή απόρριψέ τες.',
    keepEditing: 'Συνέχισε την επεξεργασία',
    discard: 'Απόρριψη',
    cancel: 'Άκυρο',
    remove: 'Αφαίρεση',
    tryAgain: 'Δοκίμασε ξανά.',

    alertCityTitle: 'Η πόλη δεν ανατέθηκε',
    alertCityBody: 'Δοκίμασε να αναθέσεις ξανά την πόλη.',
    alertNameTitle: 'Πρόσθεσε όνομα',
    alertNameBody: 'Δώσε όνομα σε αυτή τη στιγμή.',
    alertMomentSavedTitle: 'Η στιγμή αποθηκεύτηκε',
    alertImportNotMarked:
      'Η στάση μπήκε στο πρόγραμμα. Η γραμμή εισαγωγής δεν σημειώθηκε ως ελεγμένη — μπορείς να το ολοκληρώσεις στο Import Review.',
    alertTimeTitle: 'Έλεγξε την ώρα της στιγμής',
    alertTimeBody: 'Η ώρα λήξης πρέπει να είναι μετά την ώρα έναρξης.',
    alertSaveFailed: 'Δεν αποθηκεύτηκε η στιγμή',
    alertAddFailed: 'Δεν προστέθηκε η στιγμή',
    alertRemoveTitle: 'Αφαίρεση στιγμής;',
    alertRemoveFailed: 'Δεν αφαιρέθηκε η στιγμή',
    alertReorderFailed: 'Δεν άλλαξε η σειρά του προγράμματος',
    locationApplyFailed:
      'Το επιλεγμένο σημείο δεν εφαρμόστηκε. Η στιγμή σου παραμένει ίδια.',
  },

  bookingType: {
    flight: 'Πτήση',
    train: 'Τρένο',
    bus: 'Λεωφορείο',
    ferry: 'Πλοίο',
    car: 'Αυτοκίνητο',
    hotel: 'Ξενοδοχείο',
    activity: 'Δραστηριότητα',
    restaurant: 'Εστιατόριο',
    ticket: 'Εισιτήριο',
    other: 'Άλλο',
  },

  bookingStatus: {
    planned: 'Σχεδιασμένη',
    confirmed: 'Επιβεβαιωμένη',
    completed: 'Ολοκληρωμένη',
    cancelled: 'Ακυρωμένη',
  },

  bookings: {
    title: 'Κρατήσεις',
    subtitle: 'Επιβεβαιώσεις, κρατήσεις και στοιχεία πληρωμής.',
    add: 'Πρόσθεσε κράτηση',
    importCalendar: 'Εισαγωγή ημερολογίου',
    importCalendarToReview: 'Εισαγωγή ημερολογίου για έλεγχο',
    emptyTitle: 'Τίποτα προς παρακολούθηση ακόμα.',
    emptyBody:
      'Πρόσθεσε πτήσεις, ξενοδοχεία, μετακινήσεις, εστιατόρια, δραστηριότητες και εισιτήρια.',
    summaryLabel: (total: number, confirmed: number, paid: number) =>
      `${total} κρατήσεις, ${confirmed} επιβεβαιωμένες, ${paid} πληρωμένες`,
    countLabel: (count: number) => (count === 1 ? 'κράτηση' : 'κρατήσεις'),
    confirmedLabel: 'επιβεβαιωμένες',
    paidLabel: 'πληρωμένες',
    openLinkedAccommodation: 'Άνοιξε συνδεδεμένη διαμονή',
    openAccommodation: 'Άνοιξε τη διαμονή',

    editorEdit: 'Επεξεργασία κράτησης',
    editorAdd: 'Πρόσθεσε κράτηση',
    editorClose: 'Κλείσε τον επεξεργαστή κράτησης',
    labelType: 'ΤΥΠΟΣ',
    labelStatus: 'ΚΑΤΑΣΤΑΣΗ',
    labelName: 'ΟΝΟΜΑ ΚΡΑΤΗΣΗΣ',
    labelProvider: 'ΠΑΡΟΧΟΣ',
    labelCode: 'ΚΩΔΙΚΟΣ ΕΠΙΒΕΒΑΙΩΣΗΣ',
    labelLink: 'ΣΥΝΔΕΣΜΟΣ ΚΡΑΤΗΣΗΣ',
    labelStart: 'ΕΝΑΡΞΗ',
    labelEnd: 'ΛΗΞΗ',
    labelAmount: 'ΠΟΣΟ',
    labelCurrency: 'ΝΟΜΙΣΜΑ',
    labelNotes: 'ΣΗΜΕΙΩΣΕΙΣ',
    placeholderName: 'Πτήση για Τόκιο',
    placeholderProvider: 'Aegean, Booking.com…',
    placeholderNotes: 'Θέση, τερματικός, σημειώσεις check-in…',
    choosePlanMoment: 'Διάλεξε στιγμή προγράμματος',
    chooseMomentFromPlan: 'Διάλεξε στιγμή από το πρόγραμμά σου',
    notAddedToPlan: 'Δεν προστέθηκε στο πρόγραμμα',
    keepSeparate: 'Κράτα αυτή την κράτηση ξεχωριστά',
    addMomentsFirst:
      'Πρόσθεσε στιγμές στο Πρόγραμμα πριν συνδέσεις αυτή την κράτηση.',
    linkHelp:
      'Σύνδεσε αυτή την κράτηση με μια στιγμή για να εμφανίζεται με το πρόγραμμά σου.',
    paid: 'Πληρωμένη',
    paidHelp: 'Σημείωσε αυτή την κράτηση ως ήδη πληρωμένη.',
    saving: 'Αποθήκευση…',
    saveChanges: 'Αποθήκευση αλλαγών',
    saveBookingChanges: 'Αποθήκευση αλλαγών κράτησης',
    saveNewBooking: 'Αποθήκευση νέας κράτησης',

    alertNameTitle: 'Πρόσθεσε όνομα κράτησης',
    alertNameBody: 'Δώσε ένα σαφές όνομα σε αυτή την κράτηση.',
    alertAmountTitle: 'Έλεγξε το ποσό',
    alertAmountBody: 'Δώσε έγκυρο ποσό κράτησης.',
    bookingStart: 'Έναρξη κράτησης',
    bookingEnd: 'Λήξη κράτησης',
    alertSaveFailed: 'Δεν αποθηκεύτηκε η κράτηση',
    alertStopUnavailable:
      'Η επιλεγμένη στιγμή δεν είναι πλέον διαθέσιμη για αυτό το ταξίδι. Διάλεξε άλλη στιγμή ή άφησε την κράτηση εκτός προγράμματος.',
    alertDeleteTitle: 'Διαγραφή κράτησης;',
    alertDeleteFailed: 'Δεν διαγράφηκε η κράτηση',
    alertLinkUnavailableTitle: 'Ο σύνδεσμος δεν είναι διαθέσιμος',
    alertLinkUnavailableBody:
      'Αυτός ο αποθηκευμένος σύνδεσμος κράτησης δεν άνοιξε.',
    alertActionFailedTitle: 'Η ενέργεια απέτυχε',
    alertActionFailedBody: 'Τίποτα δεν άλλαξε σε αυτή την κράτηση.',
    cancel: 'Άκυρο',
    delete: 'Διαγραφή',
    tryAgain: 'Δοκίμασε ξανά.',

    savedAbsolute: 'Αποθηκευμένη απόλυτη στιγμή',
    savedNeedsReview: 'Η αποθηκευμένη ώρα θέλει έλεγχο',
    savedOtherFormat:
      'Αυτή η αποθηκευμένη ώρα χρησιμοποιεί άλλη μορφή. Αντικατέστησέ την ή καθάρισέ την για αλλαγές.',
    savedNotEditable:
      'Αυτή η αποθηκευμένη ώρα δεν επεξεργάζεται στη μορφή της. Αντικατέστησέ την ή καθάρισέ την για αλλαγές.',
  },

  companion: {
    header: 'ΣΥΝΟΔΟΣ',
    viewPlan: 'ΔΕΣ ΤΟ ΠΡΟΓΡΑΜΜΑ',
    beforeJourney: 'ΠΡΙΝ ΤΟ ΤΑΞΙΔΙ',
    onJourney: 'ΣΤΟ ΤΑΞΙΔΙ',
    journeyComplete: 'ΤΟ ΤΑΞΙΔΙ ΟΛΟΚΛΗΡΩΘΗΚΕ',
    datesNeedReview: 'ΟΙ ΗΜΕΡΟΜΗΝΙΕΣ ΘΕΛΟΥΝ ΕΛΕΓΧΟ',
    departure: 'ΑΝΑΧΩΡΗΣΗ',
    dayToGo: 'μέρα ακόμα',
    daysToGo: 'μέρες ακόμα',
    beforeBody:
      'Ολοκλήρωσε τα βασικά και ρίξε μια πρώτη ματιά στη διαδρομή που έρχεται.',
    firstDay: 'ΠΡΩΤΗ ΜΕΡΑ',
    afterTravel: 'ΜΕΤΑ ΤΟ ΤΑΞΙΔΙ',
    goBack: 'Πίσω',
    openTripDetails: 'Άνοιξε τα στοιχεία ταξιδιού',
    destinationNotSet: 'Ο προορισμός δεν έχει οριστεί',
    cityNotSetToday: 'Δεν έχει οριστεί πόλη για σήμερα',
    statusMismatch:
      'Η κατάσταση του ταξιδιού και οι ημερομηνίες διαφέρουν. Ο Συνοδός ακολουθεί τις ημερομηνίες σου.',
    viewFirstDay: 'Δες την πρώτη μέρα στο Πρόγραμμα',
    firstDayOpen: 'Η πρώτη σου μέρα είναι ανοιχτή',
    firstDayOpenBody: 'Πρόσθεσε μια στιγμή όποτε είσαι έτοιμος/η.',
    todayUnavailable: 'Το σημερινό πρόγραμμα δεν είναι διαθέσιμο',
    checkDates: 'Έλεγξε τις ημερομηνίες του ταξιδιού',
    checkDatesBody:
      'Το σήμερα πέφτει μέσα σε αυτό το ταξίδι, αλλά το πρόγραμμά του δεν βρέθηκε.',
    openPlan: 'Άνοιξε το Πρόγραμμα',
    timezoneNeeded:
      'Το «τώρα» και το «επόμενο» θέλουν αποθηκευμένη ζώνη ώρας για τη σημερινή πόλη. Το σημερινό πρόγραμμα μένει στη σειρά του πλάνου.',
    noLaterOpen:
      'Δεν υπάρχει άλλη χρονισμένη στιγμή ανοιχτή σήμερα. Οι σημάνσεις «έγινε» και «παραλείφθηκε» δεν αλλάζουν το αποθηκευμένο πρόγραμμα.',
    noLaterSaved:
      'Δεν υπάρχει άλλη χρονισμένη στιγμή αποθηκευμένη σήμερα. Οι στιγμές χωρίς ώρα παραμένουν ορατές χωρίς να θεωρούνται τρέχουσες.',
    todaysPlan: 'Το σημερινό πρόγραμμα',
    planOrder: 'Σειρά προγράμματος',
    fullPlan: 'Πλήρες Πρόγραμμα',
    nothingPlanned: 'Δεν υπάρχει τίποτα σχεδιασμένο για αυτή τη μέρα',
    nothingPlannedBody:
      'Ο Συνοδός δεν έχει στιγμή να θεωρήσει τρέχουσα ή επόμενη. Η μέρα παραμένει ανοιχτή.',
    historyBody:
      'Ο Συνοδός δείχνει τώρα το αποθηκευμένο ιστορικό του ταξιδιού σου. Τίποτα δεν παρουσιάζεται ως να συμβαίνει τώρα.',
    finalDayHistory: 'Ιστορικό τελευταίας μέρας',
    noFinalDay: 'Δεν καταγράφηκε πρόγραμμα τελευταίας μέρας',
    noFinalDayBody: 'Δεν προστέθηκαν στιγμές σε αυτή τη μέρα.',
    afterTravelBody:
      'Οι Αναμνήσεις και το Βιβλίο ταξιδιού θα σε βοηθήσουν να ξαναζήσεις αυτή τη διαδρομή σε μελλοντική έκδοση.',
    needValidDates: 'Ο Συνοδός χρειάζεται έγκυρες ημερομηνίες',
    liveUnavailable: 'Το ζωντανό πλαίσιο δεν είναι διαθέσιμο',
    liveUnavailableBody:
      'Οι αποθηκευμένες ημερομηνίες θέλουν προσοχή πριν ο Συνοδός δείξει τη σωστή μέρα ή στιγμή.',
    reviewTripDetails: 'Έλεγξε τα στοιχεία ταξιδιού',
    timeNotSet: 'Δεν ορίστηκε ώρα',
    noTime: 'Χωρίς ώρα · ',
    openInPlan: 'Άνοιξε στο Πρόγραμμα',
    showOnMap: 'Δες στον χάρτη',
    directions: 'Οδηγίες',
    stayDetailsSaved: 'Στοιχεία διαμονής αποθηκευμένα',
    stayContextSaved: 'Πλαίσιο διαμονής αποθηκευμένο',
    accommodation: 'Διαμονή',
    stayNotAdded: 'Δεν προστέθηκε διαμονή',
    bookings: 'Κρατήσεις',
    bookingsNotAdded: 'Δεν προστέθηκαν κρατήσεις',
    travelers: 'Ταξιδιώτες',
    travelersNotAdded: 'Δεν προστέθηκαν ταξιδιώτες',
    budget: 'Προϋπολογισμός',
    budgetSet: 'Ο προϋπολογισμός ορίστηκε',
    budgetNotSet: 'Ο προϋπολογισμός δεν ορίστηκε',
    tripDetails: 'Στοιχεία ταξιδιού',
    dismissPlanUpdate: 'Κλείσε την ενημέρωση προγράμματος',
  },

  freeTimeCard: {
    thinking: 'Σκέφτεται…',
    refreshIdeas: 'Ανανέωσε ιδέες',
    askTravelOS: 'Ρώτα το TravelOS',
    openPlanForDay: 'Άνοιξε το Πρόγραμμα για αυτή τη μέρα',
  },

  readiness: {
    /** Keyed by the semantic actionLabel the readiness service reports. */
    action: {
      View: 'Δες',
      Add: 'Πρόσθεσε',
      Continue: 'Συνέχεια',
    },
    plan: 'Πρόγραμμα',
    planNotReady: 'Οι μέρες του ταξιδιού δεν είναι ακόμα έτοιμες',
    planDays: (populated: number, total: number) =>
      `${populated} από ${total} μέρες έχουν στιγμές`,
    accommodation: 'Διαμονή',
    staysSaved: (count: number) =>
      count === 1 ? '1 διαμονή αποθηκευμένη' : `${count} διαμονές αποθηκευμένες`,
    noStay: 'Δεν έχει αποθηκευτεί διαμονή',
    bookings: 'Κρατήσεις',
    activeBookings: (count: number) =>
      count === 1 ? '1 ενεργή κράτηση' : `${count} ενεργές κρατήσεις`,
    noBookings: 'Δεν υπάρχουν ενεργές κρατήσεις',
    travelers: 'Ταξιδιώτες',
    travelersAdded: (count: number) =>
      count === 1 ? '1 ταξιδιώτης προστέθηκε' : `${count} ταξιδιώτες προστέθηκαν`,
    noTravelers: 'Δεν προστέθηκαν ταξιδιώτες',
    budget: 'Προϋπολογισμός',
    budgetSet: 'Ο προϋπολογισμός ορίστηκε',
    noBudget: 'Δεν υπάρχει προϋπολογισμός ακόμα',
    packing: 'Βαλίτσα',
    packingBody:
      'Πρόσθεσε αντικείμενα όποτε είσαι έτοιμος/η. Τίποτα δεν επινοείται για σένα.',
    importReview: 'Έλεγχος εισαγωγής',
  },

  dateTimeField: {
    chooseDateCompact: 'Διάλεξε ημ/νία',
    chooseDate: 'Διάλεξε ημερομηνία',
    addTime: 'Πρόσθεσε ώρα',
    chooseOptionalTime: 'Διάλεξε προαιρετική ώρα',
    localTime: 'Τοπική ώρα',
    savedTimeNeedsReview: 'Η αποθηκευμένη ώρα θέλει έλεγχο',
    chooseLabel: (label: string) => `Διάλεξε ${label.toLowerCase()}`,
    clearLabel: (label: string) => `Καθάρισε ${label.toLowerCase()}`,
  },

  evidence: {
    /** Keyed by the readiness checklist id the service reports. */
    gap: {
      plan: 'πρόγραμμα',
      accommodation: 'διαμονή',
      bookings: 'κρατήσεις',
      travelers: 'ταξιδιώτες',
      budget: 'προϋπολογισμός',
    } as Record<string, string>,
    noDestinationNames: 'Δεν έχουν αποθηκευτεί ονόματα προορισμών',
    readinessUnknown: 'Η ετοιμότητα είναι άγνωστη',
    readiness: (percent: number, gaps: string) =>
      `${percent}% έτοιμο · εκκρεμούν: ${gaps}`,
    noGaps: 'καμία',
    packingEmpty: 'Η βαλίτσα είναι άδεια',
    packed: (packed: number, total: number) =>
      `${packed}/${total} ετοιμασμένα`,
    pendingClaims: (count: number) =>
      count === 1
        ? '1 εκκρεμής εισαγόμενη καταχώριση'
        : `${count} εκκρεμείς εισαγόμενες καταχωρίσεις`,
    noPendingClaims: 'Καμία εκκρεμής εισαγόμενη καταχώριση',
  },

  copilot: {
    eyebrow: 'ΣΥΝΟΔΟΣ ΤΑΞΙΔΙΟΥ',
  },

  tripTheme: {
    inkMood: 'Η διαδρομή σου',
    mediterraneanMood: 'Φως της Μεσογείου',
    centralEuropeMood: 'Πόλεις των ποταμών',
    nordicMood: 'Βόρεια γαλήνη',
    atlanticMood: 'Καιρός των νησιών',
  },

  /**
   * One source for the free-time and Plan Assist activity copy. Both the
   * icon-carrying card catalogue and the plain Node-safe one read from here.
   */
  activity: {
    slow_walk: {
      title: 'Κάνε μια αργή βόλτα',
      body: 'Κράτα το κενό εύκολο και αδόμητο.',
    },
    coffee_or_rest: {
      title: 'Κάνε μια παύση για καφέ ή ξεκούραση',
      body: 'Χρησιμοποίησε τον χρόνο ως χαλαρό reset.',
    },
    food_browse: {
      title: 'Δες τοπικό φαγητό',
      body: 'Εξερεύνησε φαγητό χαλαρά, χωρίς να δεσμευτείς σε συγκεκριμένο μαγαζί.',
    },
    culture_browse: {
      title: 'Πρόσθεσε λίγο πολιτισμό',
      body: 'Αξιοποίησε το κενό για μια ελαφριά πολιτιστική παράκαμψη.',
    },
    local_browse: {
      title: 'Εξερεύνησε την περιοχή',
      body: 'Περιπλανήσου τοπικά χωρίς να το κάνεις σταθερή στάση.',
    },
    photo_walk: {
      title: 'Κάνε μια φωτογραφική βόλτα',
      body: 'Χαμήλωσε ρυθμό και πρόσεξε τον χώρο μέσα από τον φακό σου.',
    },
    shopping_browse: {
      title: 'Ρίξε μια ματιά στα μαγαζιά',
      body: 'Άφησε χώρο για χαλαρές αγορές χωρίς σταθερό προορισμό.',
    },
    wellness_pause: {
      title: 'Κάνε μια παύση ευεξίας',
      body: 'Αξιοποίησε το κενό για ήρεμο reset πριν την επόμενη στιγμή.',
    },
    scenic_pause: {
      title: 'Κάνε μια παύση με θέα',
      body: 'Κράτα τον χρόνο ανοιχτό για μια ήσυχη θέα ή μια πιο αργή στιγμή.',
    },
    flexible_buffer: {
      title: 'Κράτα το περιθώριο',
      body: 'Προστάτεψε τον ελεύθερο χρόνο αντί να γεμίσεις κάθε λεπτό.',
    },
  },

  planAssist: {
    eyebrow: 'PLAN ASSIST',
    accept: 'Αποδοχή',
    provenanceTheme: 'θέμα · προτιμήσεις ταξιδιού',
    provenanceCurated: (packId: string) => `επιμελημένο · ${packId}`,
    provenanceFallback: 'θέμα',
    calmBody:
      'Μια ήρεμη θεματική στιγμή — διάλεξε τόπο αργότερα αν θέλεις.',
    bufferBody:
      'Κρατά τον ελεύθερο χρόνο ειλικρινή — τα ημιτελή πλάνα είναι έγκυρα.',
  },

  map: {
    eyebrow: 'ΧΑΡΤΗΣ ΤΑΞΙΔΙΟΥ',
    todaysMap: 'Ο ΧΑΡΤΗΣ ΣΗΜΕΡΑ',
    firstDay: 'ΠΡΩΤΗ ΜΕΡΑ',
    lastDay: 'ΤΕΛΕΥΤΑΙΑ ΜΕΡΑ',
    destinationMarker: 'Προορισμός ταξιδιού',
    stayMarker: 'Αποθηκευμένη διαμονή',
    emptyTitle: 'Δεν υπάρχουν ακόμα σημεία στον χάρτη',
    emptyWithAnchors:
      'Ο προορισμός ή οι διαμονές σου είναι στον χάρτη. Οι στάσεις του προγράμματος θα εμφανιστούν μόλις έχουν πραγματικές συντεταγμένες.',
    emptyWithout:
      'Προορισμοί, διαμονές και στάσεις θα εμφανιστούν εδώ μόλις έχουν πραγματικές συντεταγμένες.',
    noGuessed: 'Καμία εικασία σημείων',
    routesUnavailable: 'Οι πεζές διαδρομές δεν είναι διαθέσιμες',
    directions: 'Οδηγίες',
    today: 'Σήμερα',
    viewAll: 'Δες όλα',
  },

  offline: {
    noPinBody:
      'Το ταξίδι, οι κρατήσεις και οι διαμονές είναι αποθηκευμένα σε αυτή τη συσκευή. Δεν υπάρχει αποθηκευμένη πινέζα και οι ζωντανοί χάρτες θέλουν δίκτυο.',
    liveLookupBody:
      'Το ταξίδι, οι κρατήσεις και οι διαμονές είναι αποθηκευμένα σε αυτή τη συσκευή. Η ζωντανή αναζήτηση θέλει δίκτυο.',
    savedPinsBody:
      'Οι αποθηκευμένες πινέζες μένουν σε αυτή τη συσκευή. Οι ζωντανοί χάρτες θέλουν δίκτυο. Οι οδηγίες χρησιμοποιούν την αποθηκευμένη πινέζα, όχι αποθηκευμένη διαδρομή.',
    allSavedBody:
      'Ταξίδι, κρατήσεις, διαμονές και αποθηκευμένες πινέζες είναι σε αυτή τη συσκευή. Οι χάρτες και η ζωντανή αναζήτηση θέλουν δίκτυο.',
    noInventedPin:
      'Οι στάσεις χωρίς αποθηκευμένες συντεταγμένες μένουν εκτός χάρτη. Το TravelOS δεν επινοεί πινέζα.',
  },

  more: {
    title: 'Κέντρο ταξιδιού',
    subtitle: 'Στοιχεία και εργαλεία για αυτό το ταξίδι.',
    dateNeedsReview: 'Η ημερομηνία θέλει έλεγχο',
    spentOf: (spent: string, planned: string) =>
      `${spent} από ${planned}`,
    spent: (spent: string) => `${spent} δαπανήθηκαν`,
    setBudget: (currency: string) =>
      `Όρισε προϋπολογισμό σε ${currency}`,
    currencyNeedsReview: 'Το νόμισμα θέλει έλεγχο',
    sectionTrip: 'ΤΑΞΙΔΙ',
    travelerCount: (count: number) =>
      count === 1 ? '1 ταξιδιώτης' : `${count} ταξιδιώτες`,
    stayCount: (count: number) =>
      count === 1 ? '1 διαμονή' : `${count} διαμονές`,
    memoryCount: (count: number) =>
      count === 1
        ? '1 στιγμή αποθηκευμένη'
        : `${count} στιγμές αποθηκευμένες`,
    travelBookBody: (count: number) =>
      count === 1
        ? 'Δώσε μορφή σε 1 αποθηκευμένη στιγμή στην ιστορία του ταξιδιού'
        : `Δώσε μορφή σε ${count} αποθηκευμένες στιγμές στην ιστορία του ταξιδιού`,
    tripDetails: 'Στοιχεία ταξιδιού',
    tripDetailsBody: 'Ημερομηνίες, προορισμός, κατάσταση και νόμισμα',
    travelers: 'Ταξιδιώτες',
    sectionPlanning: 'ΣΧΕΔΙΑΣΜΟΣ',
    copilot: 'Συνοδός ταξιδιού',
    copilotBody: 'Ετοιμότητα, Plan Assist και επόμενα βήματα ελεύθερου χρόνου',
    budget: 'Προϋπολογισμός & έξοδα',
    accommodation: 'Διαμονή',
    packing: 'Βαλίτσα',
    packingBody: 'Λίστα που φτιάχνεις εσύ για αυτό το ταξίδι',
    sharePreparing: 'Προετοιμασία κοινοποίησης…',
    share: 'Κοινοποίηση στιγμιότυπου ταξιδιού',
    shareBody:
      'Κοινοποίηση συστήματος για μη απόρρητη περίληψη. Κωδικοί και ιδιωτικές επαφές μένουν έξω.',
    sectionJourney: 'Η ΔΙΑΔΡΟΜΗ ΣΟΥ',
    memories: 'Αναμνήσεις',
    travelBook: 'Βιβλίο ταξιδιού',
    travelBookEmpty:
      'Πρόσθεσε πρώτα αναμνήσεις και μετά δώσε μορφή στην ιστορία αυτού του ταξιδιού',
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

    whenEyebrow: 'ΠΟΤΕ',
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

  /** Sentence-case status for inline meta rows. */
  tripStatusLabel: {
    draft: 'Πρόχειρο',
    planned: 'Σχεδιασμένο',
    active: 'Σε εξέλιξη',
    completed: 'Ολοκληρωμένο',
    archived: 'Στο αρχείο',
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
