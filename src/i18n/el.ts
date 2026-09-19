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
  /** Reusable accessibility phrasings built around a name. */
  a11y: {
    edit: (name: string) => `Επεξεργασία ${name}`,
    remove: (name: string) => `Αφαίρεση ${name}`,
    removeQuestion: (name: string) => `Αφαίρεση ${name};`,
    del: (name: string) => `Διαγραφή ${name}`,
    open: (name: string) => `Άνοιξε ${name}`,
    openBooking: (name: string) => `Άνοιξε την κράτηση ${name}`,
    openLinkedBooking: (name: string) =>
      `Άνοιξε τη συνδεδεμένη κράτηση ${name}`,
    openInPlan: (name: string) => `Άνοιξε ${name} στο Πρόγραμμα`,
    openInPlanWith: (name: string, label: string) =>
      `Άνοιξε ${name} στο Πρόγραμμα, ${label.toLowerCase()}`,
    openWithBody: (title: string, body: string) => `Άνοιξε ${title}. ${body}`,
    openDirections: (name: string) => `Άνοιξε οδηγίες προς ${name}`,
    moveEarlier: (name: string) => `Μετακίνησε ${name} νωρίτερα`,
    moveLater: (name: string) => `Μετακίνησε ${name} αργότερα`,
    accept: (name: string) => `Αποδοχή ${name}`,
    dayLabel: (day: number) => `Μέρα ${day}`,
    dayWithDate: (day: number, date: string) => `Μέρα ${day} · ${date}`,
    dayPrefix: (day: number) => `Μέρα ${day} · `,
    dayDatePrefix: (day: number, date: string) => `Μέρα ${day} · ${date} · `,
    jumpToDay: (day: number, date: string) =>
      `Μετάβαση στη μέρα ${day}, ${date}`,
    dayState: (day: number, date: string, state: string) =>
      `Μέρα ${day}, ${date}${state}`,
    collapsed: ', συμπτυγμένη',
    expanded: ', ανεπτυγμένη',
    addMomentToDay: (day: number) => `Πρόσθεσε στιγμή στη μέρα ${day}`,
    leaveDayUnassigned: (day: number) =>
      `Άφησε τη μέρα ${day} χωρίς πόλη`,
    assignToDay: (name: string, day: number) =>
      `Ανάθεσε ${name} στη μέρα ${day}`,
    assignToToday: (name: string) => `Ανάθεσε ${name} στο σήμερα`,
    until: (time: string) => `Έως ${time}`,
    showOnMap: (name: string) => `Δείξε ${name} στον χάρτη`,
    showOnMapWithMemories: (name: string, count: number) =>
      `Δείξε ${name} στον χάρτη, ${count} ${
        count === 1 ? 'ανάμνηση' : 'αναμνήσεις'
      }`,
    addMapDetails: (name: string) => `Πρόσθεσε στοιχεία χάρτη για ${name}`,
    openCitedSource: (label: string) => `Άνοιξε την τεκμηριωμένη πηγή ${label}`,
    makeATrip: (name: string) => `Κάνε το ${name} ταξίδι`,
    removeFromSavedNamed: (name: string) =>
      `Αφαίρεσε ${name} από τις αποθηκευμένες ιδέες`,
    saveAsIdea: (name: string) => `Αποθήκευσε ${name} ως ιδέα`,
    choose: (name: string) => `Διάλεξε ${name}`,
    startCreateTripFrom: (name: string) =>
      `Ξεκίνα τη Δημιουργία ταξιδιού από ${name}`,
    addAsStop: (name: string) => `Πρόσθεσε ${name} ως στάση`,
    markReviewed: (name: string) => `Σημείωσε ${name} ως ελεγμένο`,
    acceptAsBooking: (name: string) => `Αποδοχή ${name} ως κράτηση`,
    dismiss: (name: string) => `Απόρριψη ${name}`,
    freeTimeIdeas: (from: string, to: string) =>
      `Ιδέες ελεύθερου χρόνου από ${from} έως ${to}`,
  },

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
    removeStopBody: (name: string, extra: string) =>
      `Αφαίρεση «${name}» από αυτή τη μέρα;${extra}`,
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
    removeBookingBody: (name: string) =>
      `Αφαίρεση «${name}» από αυτό το ταξίδι; Οι συνδεδεμένες διαμονές κρατούν τα στοιχεία τους. Αυτή η κράτηση δεν ανακτάται μετά τη διαγραφή.`,
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

  packing: {
    alertAddFailed: 'Δεν προστέθηκε το είδος',
    alertUpdateFailed: 'Δεν ενημερώθηκε το είδος',
    alertRemoveTitle: 'Αφαίρεση είδους αποσκευής;',
    alertRemoveFailed: 'Δεν αφαιρέθηκε το είδος',
    tryAgain: 'Δοκίμασε ξανά.',
    cancel: 'Άκυρο',
    remove: 'Αφαίρεση',
    loadFailed: 'Δεν ήταν δυνατή η φόρτωση των ειδών αποσκευής.',
    removeLabel: (title: string) => `Αφαίρεση ${title}`,
  },

  travelerType: {
    adultLabel: 'Ενήλικας',
    adultDescription: 'Ενήλικας ταξιδιώτης',
    childLabel: 'Παιδί',
    childDescription: 'Παιδί ταξιδιώτης',
    infantLabel: 'Βρέφος',
    infantDescription: 'Βρέφος ταξιδιώτης',
  },

  travelers: {
    title: 'Ταξιδιώτες',
    subtitle: 'Οι άνθρωποι που έρχονται σε αυτό το ταξίδι.',
    add: 'Πρόσθεσε ταξιδιώτη',
    countLabel: (count: number) =>
      count === 1 ? 'ταξιδιώτης' : 'ταξιδιώτες',
    summaryLabel: (count: number) =>
      count === 1
        ? '1 ταξιδιώτης σε αυτό το ταξίδι'
        : `${count} ταξιδιώτες σε αυτό το ταξίδι`,
    emptyBody:
      'Πρόσθεσε κάποιον νέο ή διάλεξε ταξιδιώτη που έχεις ήδη αποθηκεύσει. Ένα ταξίδι μπορεί να μείνει χωρίς ταξιδιώτες όσο σχεδιάζεις, και μπορεί να έχει προαιρετικό κάτοχο.',
    privacyNote:
      'Κράτα διαβατήρια και στοιχεία υγείας εκτός των προφίλ ταξιδιωτών. Προσκλήσεις, ρόλοι πέρα από τον κάτοχο και μοίρασμα εξόδων δεν είναι ακόμα διαθέσιμα.',
    edit: 'Επεξεργασία',
    removeFromTrip: 'Αφαίρεση από το ταξίδι',
    removeOwner: 'Αφαίρεση κατόχου',
    makeOwner: 'Όρισε κάτοχο',
    savedTraveler: 'Αποθηκευμένος ταξιδιώτης',
    editorAdd: 'Πρόσθεσε ταξιδιώτη',
    editorEdit: 'Επεξεργασία ταξιδιώτη',
    editorNew: 'Νέος ταξιδιώτης',
    editorClose: 'Κλείσε τον επεξεργαστή ταξιδιώτη',
    sharedNote:
      'Οι αλλαγές σε αυτόν τον ταξιδιώτη θα φανούν και στα άλλα του ταξίδια.',
    contactNote:
      'Πρόσθεσε μόνο τα στοιχεία επικοινωνίας που χρειάζεσαι για το ταξίδι.',
    labelFirstName: 'ΟΝΟΜΑ',
    labelLastName: 'ΕΠΩΝΥΜΟ',
    labelEmail: 'EMAIL',
    labelPhone: 'ΤΗΛΕΦΩΝΟ',
    required: 'Απαιτείται',
    optional: 'Προαιρετικό',
    saving: 'Αποθήκευση…',
    saveChanges: 'Αποθήκευση αλλαγών',
    createAndAdd: 'Δημιουργία και προσθήκη στο ταξίδι',
    createNew: 'Δημιούργησε νέο ταξιδιώτη',
    addSomeoneNew: 'Πρόσθεσε κάποιον νέο σε αυτό το ταξίδι',
    savedLoadFailed:
      'Δεν φορτώθηκαν οι αποθηκευμένοι ταξιδιώτες. Μπορείς να δημιουργήσεις νέο.',
    noOtherSaved: 'Δεν υπάρχουν άλλοι αποθηκευμένοι ταξιδιώτες.',
    alertUpdateFailed: 'Δεν ενημερώθηκε ο ταξιδιώτης',
    alertCreateFailed: 'Δεν δημιουργήθηκε ο ταξιδιώτης',
    alertAddFailed: 'Δεν προστέθηκε ο ταξιδιώτης',
    alertOwnerFailed: 'Δεν ενημερώθηκε ο κάτοχος του ταξιδιού',
    alertRemoveTitle: 'Αφαίρεση από αυτό το ταξίδι;',
    alertRemoveFailed: 'Δεν αφαιρέθηκε ο ταξιδιώτης',
    unchangedBody:
      'Τα αποθηκευμένα δεδομένα σου δεν άλλαξαν. Δοκίμασε ξανά.',
    nothingChanged: 'Τίποτα δεν άλλαξε. Δοκίμασε ξανά.',
    cancel: 'Άκυρο',
    remove: 'Αφαίρεση',
    whoIsTaking: 'Ποιος έρχεται σε αυτό το ταξίδι;',
    savedTravelers: 'ΑΠΟΘΗΚΕΥΜΕΝΟΙ ΤΑΞΙΔΙΩΤΕΣ',
    travelerTypeLabel: 'ΤΥΠΟΣ ΤΑΞΙΔΙΩΤΗ',
    eyebrowAddToTrip: 'ΠΡΟΣΘΗΚΗ ΣΕ ΑΥΤΟ ΤΟ ΤΑΞΙΔΙ',
    eyebrowTraveler: 'ΤΑΞΙΔΙΩΤΗΣ',
    removeBody: (name: string) =>
      `Ο/Η ${name} θα αφαιρεθεί από αυτό το ταξίδι. Θα παραμείνει διαθέσιμος/η στα άλλα σου ταξίδια.`,
  },

  tripDetails: {
    eyebrowOverview: 'ΕΠΙΣΚΟΠΗΣΗ ΤΑΞΙΔΙΟΥ',
    title: 'Στοιχεία ταξιδιού',
    subtitle: 'Προορισμός, ημερομηνίες, κατάσταση και νόμισμα.',
    back: 'Πίσω στα Περισσότερα',
    savedToast: 'Τα στοιχεία του ταξιδιού αποθηκεύτηκαν.',

    eyebrowJourney: 'Η ΔΙΑΔΡΟΜΗ',
    basics: 'Βασικά',
    labelTitle: 'ΤΙΤΛΟΣ ΤΑΞΙΔΙΟΥ',
    titlePlaceholder: 'Καλοκαίρι στην Ιαπωνία',
    labelStatus: 'ΚΑΤΑΣΤΑΣΗ',
    activeStatus: 'Σε εξέλιξη',
    activeNote:
      'Η κατάσταση «σε εξέλιξη» ορίζεται αυτόματα όσο το ταξίδι συμβαίνει.',

    eyebrowCharacter: 'ΧΑΡΑΚΤΗΡΑΣ ΤΑΞΙΔΙΟΥ',
    intentAndPace: 'Πρόθεση & ρυθμός',
    unsetHint: 'Πάτα ξανά την επιλεγμένη επιλογή για να την αφήσεις κενή.',
    intentEyebrow: 'ΚΥΡΙΑ ΠΡΟΘΕΣΗ · ΠΡΟΑΙΡΕΤΙΚΟ',
    intentQuestion: 'Τι μετράει περισσότερο για αυτό το ταξίδι;',
    paceEyebrow: 'ΡΥΘΜΟΣ ΤΑΞΙΔΙΟΥ · ΠΡΟΑΙΡΕΤΙΚΟ',
    paceQuestion: 'Πόσο γεμάτες θέλεις τις μέρες;',

    eyebrowWhere: 'ΠΟΥ',
    destinations: 'Προορισμοί',
    noDestinationYet:
      'Αυτό το ταξίδι δεν έχει ακόμα προορισμό. Πρόσθεσε πραγματικό σημείο στον χάρτη πριν αποθηκεύσεις.',
    timezoneFootnote:
      'Κάθε πόλη μπορεί να κρατά τη δική της ζώνη ώρας όταν την παρέχει κατάλογος, πάροχος χάρτη ή εσύ. Το TravelOS δεν μαντεύει ζώνη από συντεταγμένες ή σειρά προορισμών. Ο Συνοδός χρησιμοποιεί τη ζώνη εκείνης της πόλης για σήμερα όταν η μέρα είναι ανατεθειμένη και ακριβώς μία πόλη είναι τοπικά σήμερα.',
    destinationWillUpdate:
      'Αυτός ο προορισμός θα ενημερωθεί όταν αποθηκεύσεις.',

    eyebrowWhen: 'ΠΟΤΕ',
    travelDates: 'Ημερομηνίες ταξιδιού',
    labelStartDate: 'ΗΜΕΡΟΜΗΝΙΑ ΕΝΑΡΞΗΣ',
    labelEndDate: 'ΗΜΕΡΟΜΗΝΙΑ ΛΗΞΗΣ',

    eyebrowMoney: 'ΧΡΗΜΑΤΑ ΤΑΞΙΔΙΟΥ',
    budgetCurrency: 'Νόμισμα προϋπολογισμού',
    labelBudgetCurrency: 'ΝΟΜΙΣΜΑ ΠΡΟΫΠΟΛΟΓΙΣΜΟΥ',
    currencyNote:
      'Χρησιμοποιείται για τα σύνολα του ταξιδιού. Τα τοπικά νομίσματα μένουν ξεχωριστά.',

    saving: 'Αποθήκευση ταξιδιού…',
    save: 'Αποθήκευση στοιχείων',

    dangerZone: 'ΕΠΙΚΙΝΔΥΝΗ ΖΩΝΗ',
    deleteTitle: 'Διαγραφή ταξιδιού',
    deleteBody:
      'Αφαιρεί οριστικά αυτό το ταξίδι από τη συσκευή. Αρχειοθέτησέ το στην Κατάσταση αν μπορεί να το χρειαστείς. Τα JSON αντίγραφα δεν περιλαμβάνουν αρχεία φωτογραφιών.',
    delete: 'Διαγραφή',
    deleteConfirmBody:
      'Αυτό αφαιρεί οριστικά το ταξίδι και το σχετικό τοπικό πρόγραμμα, στιγμές, κρατήσεις, διαμονές, προϋπολογισμό, έξοδα, αναμνήσεις, Βιβλίο ταξιδιού και αντίγραφα φωτογραφιών από αυτή τη συσκευή. Τα πρωτότυπα στη συλλογή σου μένουν ανέγγιχτα. Δεν υπάρχει αναίρεση. Το Προφίλ προσφέρει JSON αντίγραφο δεδομένων, όχι αρχείων φωτογραφιών. Για να κρύψεις το ταξίδι αντί να το σβήσεις, διάλεξε Αρχειοθετημένο στην Κατάσταση και αποθήκευσε.',
    deleteConfirm: 'Διαγραφή ταξιδιού',
    deleteConfirmTitle: (title: string) => `Διαγραφή «${title}»;`,

    alertTitleNeeded: 'Πρόσθεσε τίτλο ταξιδιού',
    alertDestinationsTitle: 'Έλεγξε τους προορισμούς',
    alertDestinationsBody: 'Κάθε υπάρχων προορισμός χρειάζεται όνομα.',
    alertDatesTitle: 'Έλεγξε τις ημερομηνίες',
    alertDatesBody: 'Διάλεξε έγκυρο εύρος ημερομηνιών.',
    alertCurrencyTitle: 'Έλεγξε το νόμισμα',
    alertCurrencyBody:
      'Χρησιμοποίησε τριγράμματο κωδικό νομίσματος, όπως EUR ή USD.',
    alertSaveFailed: 'Δεν αποθηκεύτηκαν τα στοιχεία',
    alertBudgetLocked:
      'Αυτό το ταξίδι έχει ήδη αποθηκευμένο προϋπολογισμό. Το λογιστικό του νόμισμα δεν αλλάζει ούτε μετατρέπεται εδώ.',
    alertSaveFailedBody:
      'Το αποθηκευμένο ταξίδι παραμένει διαθέσιμο. Έλεγξε τα στοιχεία και δοκίμασε ξανά.',
    alertDeleteFailed: 'Δεν διαγράφηκε το ταξίδι',
    alertDeleteFailedBody:
      'Δεν επιβεβαιώθηκε διαγραφή. Το τοπικό σου ταξίδι παραμένει διαθέσιμο.',
    alertDestinationLimit: 'Όριο προορισμών',
    alertKeepOne: 'Κράτα έναν προορισμό',
    alertRemoveDestinationBody:
      'Οι στάσεις, οι κρατήσεις και οι διαμονές μένουν σε αυτό το ταξίδι. Αυτό αφαιρεί μόνο τον τόπο από τη λίστα προορισμών.',
    keep: 'Κράτα',
    remove: 'Αφαίρεση',
    cancel: 'Άκυρο',
  },

  accommodationType: {
    hotel: 'Ξενοδοχείο',
    apartment: 'Διαμέρισμα',
    hostel: 'Ξενώνας',
    villa: 'Βίλα',
    resort: 'Θέρετρο',
    camping: 'Κάμπινγκ',
    other: 'Άλλο',
  },

  accommodation: {
    title: 'Διαμονή',
    subtitle: 'Ξενοδοχεία, ενοικιάσεις και διαμονές για αυτό το ταξίδι.',
    add: 'Πρόσθεσε διαμονή',
    notSet: 'Δεν ορίστηκε',
    date: 'Ημερομηνία',
    stayCountLabel: (count: number) =>
      count === 1 ? 'διαμονή' : 'διαμονές',
    bookedLabel: 'με κράτηση',
    inPlanLabel: 'στο πρόγραμμα',
    summaryLabel: (stays: number, booked: number, inPlan: number) =>
      `${stays} διαμονές, ${booked} με κράτηση, ${inPlan} στο πρόγραμμα`,
    emptyTitle: 'Πρόσθεσε την πρώτη σου διαμονή',
    emptyBody:
      'Αποθήκευσε ξενοδοχείο, ενοικίαση ή άλλο μέρος που θα μείνεις. Πρόσθεσε ημερομηνίες και συνδέσμους όποτε τα έχεις.',

    editorEdit: 'Επεξεργασία διαμονής',
    editorAdd: 'Πρόσθεσε διαμονή',
    editorEyebrow: 'ΣΤΟΙΧΕΙΑ ΔΙΑΜΟΝΗΣ',
    editorClose: 'Κλείσε τον επεξεργαστή διαμονής',
    labelName: 'ΟΝΟΜΑ',
    labelAddress: 'ΔΙΕΥΘΥΝΣΗ',
    labelCheckIn: 'ΑΦΙΞΗ',
    labelCheckOut: 'ΑΝΑΧΩΡΗΣΗ',
    labelPhone: 'ΤΗΛΕΦΩΝΟ',
    labelWebsite: 'ΙΣΤΟΣΕΛΙΔΑ',
    labelNotes: 'ΣΗΜΕΙΩΣΕΙΣ',
    placeholderName: 'Όνομα ξενοδοχείου, ενοικίασης ή διαμονής',
    placeholderAddress: 'Διεύθυνση ή όνομα τόπου',
    placeholderPhone: 'Προαιρετικό τηλέφωνο',
    placeholderWebsite: 'Προαιρετική ιστοσελίδα',
    placeholderNotes: 'Πρόσβαση, check-in ή σημειώσεις διαμονής',

    replaceMapLocation: 'Άλλαξε σημείο διαμονής στον χάρτη',
    chooseMapLocation: 'Διάλεξε σημείο διαμονής στον χάρτη',
    openingPicker: 'Άνοιγμα επιλογέα τόπου…',
    realPlaceNote:
      'Διάλεξε πραγματικό μέρος. Το TravelOS δεν μαντεύει συντεταγμένες από τη διεύθυνση.',
    clearMapLocation: 'Καθάρισε το σημείο διαμονής',
    mapPinSaved: 'Η πινέζα αποθηκεύτηκε',
    addStay: 'Πρόσθεσε διαμονή',
    addHotelBookingFirst:
      'Πρόσθεσε πρώτα μια κράτηση ξενοδοχείου και μετά σύνδεσέ την εδώ.',
    clearMapPin: 'Καθάρισε την πινέζα',
    pickerTitle: 'Διάλεξε σημείο διαμονής',
    pickerDone: 'Χρήση σημείου',
    pickerSearch: 'Αναζήτηση ξενοδοχείων ή διευθύνσεων…',

    linkBooking: 'Σύνδεσε κράτηση',
    noBookingLinked: 'Δεν έχει συνδεθεί κράτηση',
    keepSeparateBookings: 'Κράτα αυτή τη διαμονή ξεχωριστά από τις κρατήσεις',
    chooseMomentFromPlan: 'Διάλεξε στιγμή από το πρόγραμμά σου',
    notInPlan: 'Εκτός προγράμματος',
    keepSeparatePlan: 'Κράτα αυτή τη διαμονή ξεχωριστά από το πρόγραμμα',

    saving: 'Αποθήκευση…',
    saveChanges: 'Αποθήκευση αλλαγών',
    chooseDate: 'Διάλεξε ημερομηνία',
    chooseTime: 'Διάλεξε ώρα',

    alertCheckInPair:
      'Διάλεξε και ημερομηνία και ώρα άφιξης, ή καθάρισε και τα δύο',
    alertCheckOutPair:
      'Διάλεξε και ημερομηνία και ώρα αναχώρησης, ή καθάρισε και τα δύο',
    locationApplyFailed:
      'Το επιλεγμένο σημείο δεν εφαρμόστηκε. Το σημείο στον χάρτη δεν άλλαξε.',
    alertSaveFailed: 'Δεν αποθηκεύτηκε η διαμονή',
    alertDeleteTitle: 'Διαγραφή διαμονής;',
    removeAccommodationBody: (name: string) =>
      `Αφαίρεση «${name}»; Κάθε συνδεδεμένη κράτηση και στάση προγράμματος θα μείνει αποθηκευμένη.`,
    alertDeleteFailed: 'Δεν διαγράφηκε η διαμονή',
    alertDeleteFailedBody:
      'Η αποθηκευμένη διαμονή σου δεν άλλαξε. Δοκίμασε ξανά.',
    tryAgain: 'Δοκίμασε ξανά.',
    cancel: 'Άκυρο',
    delete: 'Διαγραφή',
  },

  memories: {
    title: 'Αναμνήσεις',
    subtitle:
      'Κράτα τις μικρές στιγμές που έκαναν αυτή τη διαδρομή δική σου. Τα αρχεία φωτογραφιών μένουν σε αυτή τη συσκευή και δεν μπαίνουν στα JSON αντίγραφα.',
    back: 'Πίσω στα Περισσότερα',
    add: 'Πρόσθεσε ανάμνηση',
    addFirst: 'Πρόσθεσε πρώτη ανάμνηση',
    addNote: 'Πρόσθεσε σημείωση',
    addPhoto: 'Πρόσθεσε φωτογραφία',
    savedMoment: 'Αποθηκευμένη στιγμή',
    photoMemory: 'Φωτογραφική ανάμνηση',
    videoMemory: 'Ανάμνηση βίντεο',
    note: 'Σημείωση',
    noteMemory: 'Σημείωση',
    photo: 'Φωτογραφία',
    tripMoment: 'Στιγμή ταξιδιού',
    otherMoments: 'Άλλες στιγμές',
    videoTitle: 'Αναμνήσεις βίντεο',
    videoBody: 'Η επεξεργασία βίντεο δεν είναι ακόμα μέρος των Αναμνήσεων V1.',

    storyStarts: 'Η ταξιδιωτική σου ιστορία ξεκινά εδώ.',
    photoStorageNote:
      'Τα αντίγραφα φωτογραφιών μένουν στο TravelOS σε αυτή τη συσκευή και δουλεύουν χωρίς δίκτυο. Τα πρωτότυπα στη συλλογή σου μένουν ανέγγιχτα. Τα JSON αντίγραφα περιλαμβάνουν στοιχεία ανάμνησης, όχι αρχεία φωτογραφιών.',
    addAPhoto: 'Πρόσθεσε φωτογραφία',
    takeOrChoose: 'Τράβα μία τώρα ή διάλεξε κάποια που έχεις ήδη.',
    timestampNote:
      'Οι νέες αναμνήσεις παίρνουν χρονοσήμανση όταν τις αποθηκεύεις. Οι συνδέσεις μέρας και στάσης τις κρατούν στη σωστή θέση στη διαδρομή σου.',
    captureEyebrow: 'ΚΡΑΤΑ ΜΙΑ ΣΤΙΓΜΗ',
    captureTitle: 'Αποθήκευσέ την πριν χαθεί.',
    captureBody:
      'Πρόσθεσε μια σκέψη ή κράτα μια φωτογραφία, και σύνδεσέ την με τη μέρα ή τον τόπο που ανήκει.',
    emptyBody:
      'Κράτα μια σημείωση, μια φωτογραφία ή μια μικρή λεπτομέρεια που θέλεις να θυμάσαι.',

    editorEyebrow: 'Στοιχεία ανάμνησης',
    editorTitle: 'Κράτα αυτή τη στιγμή',
    editorClose: 'Κλείσε τον επεξεργαστή ανάμνησης',
    photoPreview: 'Προεπισκόπηση φωτογραφίας',
    takePhoto: 'Τράβα φωτογραφία με την κάμερα',
    choosePhoto: 'Διάλεξε φωτογραφία από τη συλλογή',
    removePhoto: 'Αφαίρεση φωτογραφίας',
    placeholderTitle: 'Ηλιοβασίλεμα στην Οία',
    labelWhySpecial: 'Τι έκανε αυτή τη στιγμή ξεχωριστή;',
    placeholderNote: 'Γράψε ό,τι θέλεις να θυμάσαι…',
    noDaySelected: 'Δεν επιλέχθηκε μέρα',
    noTripDay: 'Καμία μέρα ταξιδιού',
    noStop: 'Καμία στάση προγράμματος',
    optional: 'Προαιρετικό',
    savingMemory: 'Αποθήκευση ανάμνησης',
    saveMemoryChanges: 'Αποθήκευση αλλαγών ανάμνησης',
    saveMemory: 'Αποθήκευση ανάμνησης',
    saving: 'Αποθήκευση…',
    saveChanges: 'Αποθήκευση αλλαγών',

    alertPhotosFailed: 'Δεν άνοιξαν οι φωτογραφίες',
    alertCameraPermission: 'Χρειάζεται άδεια κάμερας',
    alertCameraPermissionBody:
      'Επίτρεψε πρόσβαση στην κάμερα για να τραβήξεις φωτογραφία για αυτή την ανάμνηση.',
    alertCameraFailed: 'Δεν άνοιξε η κάμερα',
    alertSaveFailed: 'Δεν αποθηκεύτηκε η ανάμνηση',
    alertDeleteTitle: 'Διαγραφή ανάμνησης;',
    alertDeleteFailed: 'Δεν διαγράφηκε η ανάμνηση',
    tryAgain: 'Δοκίμασε ξανά.',
    cancel: 'Άκυρο',
    delete: 'Διαγραφή',
  },

  travelBook: {
    title: 'Βιβλίο ταξιδιού',
    subtitle: 'Δώσε μορφή σε πραγματικές στιγμές του ταξιδιού σε μια ιστορία που μένει.',
    cover: 'Εξώφυλλο βιβλίου ταξιδιού',
    shapeStory: 'Δώσε μορφή στην ιστορία',
    yourWords: 'Η διαδρομή σου, με τα δικά σου λόγια.',
    selectCoverHint:
      'Διάλεξε μια αποθηκευμένη φωτογραφία παρακάτω για εξώφυλλο.',
    placeholderTitle: 'Ένα όνομα για αυτή τη διαδρομή',
    placeholderSummary: 'Μια σύντομη σκέψη με τα δικά σου λόγια…',
    draft: 'Πρόχειρο',
    stillShaping: 'Ακόμα διαμορφώνεται',
    published: 'Δημοσιευμένο',
    finishedLocally: 'Ολοκληρωμένο τοπικά',
    publishedNote: 'Το «δημοσιευμένο» είναι τοπική κατάσταση του TravelOS στην V1.',
    sharingNote: 'Η κοινοποίηση και η εξαγωγή δεν είναι ακόμα ενεργές.',
    selectedMoments: 'Επιλεγμένες στιγμές',
    chooseWhatBelongs: 'Διάλεξε τι ανήκει',
    noMomentsSelected: 'Δεν επιλέχθηκαν στιγμές',
    noMomentsBody:
      'Διάλεξε τουλάχιστον μία Ανάμνηση παρακάτω όταν θέλεις αυτό το βιβλίο να αφηγηθεί μέρος της διαδρομής.',
    addMemoriesFirst: 'Πρόσθεσε πρώτα Αναμνήσεις',
    addMemoriesBody:
      'Σημειώσεις και φωτογραφίες από τις Αναμνήσεις γίνονται το πραγματικό υλικό για το Βιβλίο ταξιδιού σου.',
    photoMoment: 'Φωτογραφική στιγμή',
    note: 'Σημείωση',
    savedNote: 'Αποθηκευμένη σημείωση',
    photo: 'Φωτογραφία',
    coverSelected: 'Επιλέχθηκε ως εξώφυλλο',
    useAsCover: 'Χρήση ως εξώφυλλο',
    savingBook: 'Αποθήκευση Βιβλίου ταξιδιού',
    saveBook: 'Αποθήκευση Βιβλίου ταξιδιού',
    deleteBook: 'Διαγραφή Βιβλίου ταξιδιού',
    momentDateUnavailable: 'Η ημερομηνία στιγμής δεν είναι διαθέσιμη',
    onlySavedMemories:
      'Η V1 χρησιμοποιεί μόνο τις αποθηκευμένες σου Αναμνήσεις. Δεν προστίθενται γεγονότα γραμμένα από AI ούτε επινοημένες λεπτομέρειες.',

    alertTitleNeeded: 'Πρόσθεσε τίτλο',
    alertTitleNeededBody:
      'Το Βιβλίο ταξιδιού χρειάζεται τίτλο πριν αποθηκευτεί.',
    alertSavedTitle: 'Το Βιβλίο ταξιδιού αποθηκεύτηκε',
    alertPublishedBody:
      'Αυτό το βιβλίο είναι σημειωμένο ως δημοσιευμένο στην τοπική σου βιβλιοθήκη TravelOS.',
    alertDraftBody: 'Το πρόχειρό σου αποθηκεύτηκε τοπικά.',
    alertSaveFailed: 'Δεν αποθηκεύτηκε',
    alertSaveFailedBody: 'Το Βιβλίο ταξιδιού δεν αποθηκεύτηκε.',
    alertDeleteTitle: 'Διαγραφή Βιβλίου ταξιδιού;',
    alertDeleteBody:
      'Η διάταξη του βιβλίου θα διαγραφεί. Οι Αναμνήσεις σου θα μείνουν ανέγγιχτες.',
    alertDeletedTitle: 'Το Βιβλίο ταξιδιού διαγράφηκε',
    alertDeletedBody: 'Το βιβλίο αφαιρέθηκε. Οι Αναμνήσεις σου είναι ακόμα αποθηκευμένες.',
    alertDeleteFailed: 'Δεν διαγράφηκε',
    alertDeleteFailedBody: 'Το Βιβλίο ταξιδιού δεν διαγράφηκε.',
    cancel: 'Άκυρο',
    delete: 'Διαγραφή',
  },

  budgetCategory: {
    accommodation: 'Διαμονή',
    transport: 'Μετακίνηση',
    food: 'Φαγητό',
    activities: 'Δραστηριότητες',
    shopping: 'Αγορές',
    insurance: 'Ασφάλιση',
    other: 'Άλλο',
  },

  budget: {
    eyebrow: (currency: string) => `ΧΡΗΜΑΤΑ ΤΑΞΙΔΙΟΥ · ${currency}`,
    title: 'Προϋπολογισμός',
    subtitle: 'Σχεδίασε τα έξοδά σου και δες τι μένει.',
    back: 'Πίσω στα Περισσότερα',
    addExpense: 'Πρόσθεσε έξοδο',
    notSet: 'Δεν ορίστηκε',
    dateNotRecorded: 'Δεν καταγράφηκε ημερομηνία',

    plannedBudget: 'ΠΡΟΫΠΟΛΟΓΙΣΜΟΣ',
    spent: 'ΔΑΠΑΝΗΘΗΚΑΝ',
    remaining: 'ΥΠΟΛΟΙΠΟ',
    overBudget: 'ΥΠΕΡΒΑΣΗ',
    editPlanned: 'Επεξεργασία προϋπολογισμού',
    convertedInto: (currency: string) => `Μετατράπηκε σε ${currency}`,
    explicitRateNote:
      'Αυτά τα σύνολα χρησιμοποιούν ρητή ισοτιμία ταξιδιώτη με ημερομηνία αναφοράς. Δεν είναι ζωντανές τιμές αγοράς.',
    fxTitle: 'Ισοτιμίες ταξιδιώτη',
    fxNote: (currency: string) =>
      `Τα έξοδα σε ξένο νόμισμα μπαίνουν στο σύνολο ${currency} μόνο όταν αποθηκεύσεις ισοτιμία. Δεν υπάρχει ζωντανή ροή ισοτιμιών.`,
    fxSave: 'Αποθήκευση ισοτιμίας',
    saveRate: 'Αποθήκευση',
    fxRemoveLabel: (currency: string) => `Αφαίρεση ισοτιμίας ${currency}`,
    remove: 'Αφαίρεση',

    eyebrowWhere: 'ΠΟΥ ΠΗΓΑΝ',
    categories: 'Κατηγορίες',
    eyebrowRecord: 'ΤΟ ΑΡΧΕΙΟ ΣΟΥ',
    expenses: 'Έξοδα',
    noExpenses: 'Δεν υπάρχουν έξοδα ακόμα',
    noExpensesBody: 'Πρόσθεσε ό,τι ξοδεύεις καθώς το ταξίδι παίρνει μορφή.',

    plannedEditorClose: 'Κλείσε τον επεξεργαστή προϋπολογισμού',
    plannedAmount: 'Ποσό προϋπολογισμού',
    labelPlannedBudget: 'ΠΡΟΫΠΟΛΟΓΙΣΜΟΣ',
    currencyLocked:
      'Το νόμισμα του ταξιδιού κλειδώνει όσο υπάρχουν αποθηκευμένα δεδομένα προϋπολογισμού.',
    currencyBeforeFirst:
      'Όρισε το νόμισμα του ταξιδιού πριν αποθηκεύσεις τον πρώτο σου προϋπολογισμό. Τα έξοδα μπορούν να κρατήσουν το νόμισμα που πλήρωσες.',
    saving: 'Αποθήκευση…',
    saveBudget: 'Αποθήκευση προϋπολογισμού',
    emptyTitle: 'Όρισε προϋπολογισμό για αυτό το ταξίδι',
    currencyNeedsReview: 'Το νόμισμα του προϋπολογισμού θέλει έλεγχο',
    originalCurrenciesNote:
      'Αυτά τα ποσά μένουν στα αρχικά τους νομίσματα και δεν περιλαμβάνονται στο σύνολο του ταξιδιού.',
    tripCurrencyLabel: 'ΝΟΜΙΣΜΑ ΤΑΞΙΔΙΟΥ',
    actualExpense: 'ΠΡΑΓΜΑΤΙΚΟ ΕΞΟΔΟ',
    actualCurrencyNote: 'Χρησιμοποίησε το νόμισμα που πραγματικά πλήρωσες.',
    emptyBody: (currency: string) =>
      `Διάλεξε πόσα θέλεις να ξοδέψεις σε ${currency}. Τα έξοδα μπορούν να κρατήσουν το νόμισμα που πλήρωσες.`,
    setBudget: 'Όρισε προϋπολογισμό',
    changeCurrency: (currency: string) => `Άλλαξε ${currency}`,
    changeCurrencyLabel: (currency: string) =>
      `Άλλαξε το νόμισμα του ταξιδιού από ${currency}`,

    editorEdit: 'Επεξεργασία εξόδου',
    editorAdd: 'Πρόσθεσε έξοδο',
    editorClose: 'Κλείσε τον επεξεργαστή εξόδου',
    labelTitle: 'ΤΙΤΛΟΣ',
    labelAmount: 'ΠΟΣΟ',
    labelCurrency: 'ΝΟΜΙΣΜΑ',
    labelCategory: 'ΚΑΤΗΓΟΡΙΑ',
    labelBooking: 'ΚΡΑΤΗΣΗ',
    labelStop: 'ΣΤΑΣΗ ΠΡΟΓΡΑΜΜΑΤΟΣ',
    labelNotes: 'ΣΗΜΕΙΩΣΕΙΣ',
    placeholderTitle: 'Δείπνο στο λιμάνι',
    placeholderNotes: 'Προαιρετικό πλαίσιο, στοιχεία απόδειξης ή ποιος πλήρωσε…',
    chooseDate: 'Διάλεξε ημερομηνία εξόδου',
    noBookingLink: 'Χωρίς σύνδεση κράτησης',
    noStopLink: 'Χωρίς σύνδεση στάσης',
    saveChanges: 'Αποθήκευση αλλαγών',

    alertBudgetTitle: 'Έλεγξε τον προϋπολογισμό',
    alertBudgetBody: 'Δώσε ποσό μηδέν ή μεγαλύτερο.',
    alertBudgetFailed: 'Δεν αποθηκεύτηκε ο προϋπολογισμός',
    alertBudgetFailedBody:
      'Τα υπάρχοντα δεδομένα προϋπολογισμού δεν άλλαξαν. Δοκίμασε ξανά.',
    alertTitleNeeded: 'Πρόσθεσε τίτλο',
    alertTitleNeededBody:
      'Δώσε όνομα σε αυτό το έξοδο ώστε να παραμείνει χρήσιμο αργότερα.',
    alertAmountTitle: 'Έλεγξε το ποσό',
    alertAmountBody: 'Δώσε ποσό εξόδου μεγαλύτερο από μηδέν.',
    alertCurrencyTitle: 'Έλεγξε το νόμισμα',
    alertCurrencyBody:
      'Χρησιμοποίησε τριγράμματο κωδικό νομίσματος, όπως EUR ή JPY.',
    alertDateTitle: 'Διάλεξε ημερομηνία',
    alertDateBody: 'Επίλεξε πότε έγινε αυτό το έξοδο.',
    alertExpenseFailed: 'Δεν αποθηκεύτηκε το έξοδο',
    alertExpenseFailedBody:
      'Τα υπάρχοντα δεδομένα εξόδων δεν άλλαξαν. Δοκίμασε ξανά.',
    alertDeleteTitle: 'Διαγραφή εξόδου;',
    removeExpenseBody: (name: string) =>
      `Αφαίρεση «${name}» από αυτόν τον προϋπολογισμό;`,
    alertDeleteFailed: 'Δεν διαγράφηκε το έξοδο',
    alertDeleteFailedBody: 'Τίποτα δεν αφαιρέθηκε. Δοκίμασε ξανά.',
    alertFxFailed: 'Δεν αποθηκεύτηκε η ισοτιμία',
    alertFxFailedBody: 'Έλεγξε τα νομίσματα, την ισοτιμία και την ημερομηνία.',
    cancel: 'Άκυρο',
    delete: 'Διαγραφή',
  },

  discoverTab: {
    eyebrow: 'ΑΝΑΚΑΛΥΨΕ',
    heading: 'Πού θα μπορούσε να σε πάει αυτό;',
    intro:
      'Ξεκίνα από έναν τόπο που ήδη έχεις στο μυαλό σου, ή άσε το TravelOS να σε βοηθήσει να αποφασίσεις πού και πότε.',
    knowWhereEyebrow: 'ΞΕΡΩ ΠΟΥ',
    knowWhereTitle: 'Ξεκίνα από έναν τόπο',
    knowWhereBody:
      'Διάλεξε προορισμό και ημερομηνίες, και χτίσε το ταξίδι από εκεί.',
    knowWhereLabel: 'Ξεκίνα τον σχεδιασμό από τόπο που ήδη ξέρεις',
    findTripEyebrow: 'ΒΡΕΣ ΤΟ ΤΑΞΙΔΙ',
    findTripTitle: 'Άσε το TravelOS να σε βοηθήσει να διαλέξεις',
    findSomewhere: 'Βρες μου έναν τόπο',
    findSomewhereBody:
      'Πες μας πότε μπορείς να ταξιδέψεις, τον προϋπολογισμό σου και τι είδους ταξίδι θέλεις.',
    bestTime: 'Καλύτερη εποχή',
    bestTimeBody:
      'Ξέρεις ήδη τον τόπο; Δες τεκμηριωμένους μήνες για αυτόν τον προορισμό.',
    journeys: 'Έτοιμες διαδρομές',
    journeysBody:
      'Εξερεύνησε επιμελημένες ιδέες ταξιδιών που μπορείς να κρατήσεις, να προσαρμόσεις και να κάνεις δικές σου.',
    saved: 'Αποθηκευμένες ιδέες',
    savedBody:
      'Κράτα προορισμούς και ιδέες διαδρομών από τον κατάλογο χωρίς να τα κάνεις ταξίδια.',
    groundedTitle: 'Χτισμένο γύρω από το πραγματικό σου ταξίδι',
    groundedBody:
      'Το Ανακάλυψε χρησιμοποιεί όσα λες ρητά στο TravelOS για αυτό το ταξίδι, κρατώντας τις προτάσεις ξεχωριστά από τα επιβεβαιωμένα πλάνα.',
  },

  world: {
    eyebrow: 'Ο ΚΟΣΜΟΣ ΣΟΥ',
    subtitle: 'Οι τόποι που συνθέτουν την ιστορία σου.',
    destinationsEyebrow: 'ΟΙ ΠΡΟΟΡΙΣΜΟΙ ΣΟΥ',
    showAllMapped: 'Δες όλους τους χαρτογραφημένους προορισμούς',
    all: 'Όλα',
    tripLabel: (count: number) => (count === 1 ? 'ταξίδι' : 'ταξίδια'),
    livedStat: 'βιωμένα',
    plannedStat: 'σχεδιασμένα',
    planned: 'Σχεδιασμένα',
    lived: 'Βιωμένα',
    plannedBadge: 'ΣΧΕΔΙΑΣΜΕΝΟ',
    livedBadge: 'ΒΙΩΜΕΝΟ',
    addMap: 'ΠΡΟΣΘΕΣΕ ΧΑΡΤΗ',
    memoryBadge: 'ΑΝΑΜΝΗΣΗ',
    memoriesBadge: 'ΑΝΑΜΝΗΣΕΙΣ',
    countryLabel: (count: number) => (count === 1 ? 'χώρα' : 'χώρες'),
    placeLabel: (count: number) => (count === 1 ? 'τόπος' : 'τόποι'),
    needMapDetails: 'θέλουν στοιχεία χάρτη',
    placesLabel: (label: string) => `Τόποι: ${label}`,
    noLived: 'Δεν υπάρχουν ακόμα βιωμένοι τόποι.',
    noPlanned: 'Δεν υπάρχουν σχεδιασμένοι τόποι σε αυτή τη λίστα.',
    startsWithTrip: 'Ο κόσμος σου ξεκινά με ένα ταξίδι.',
    markDoneHint:
      'Σημείωσε μια σχεδιασμένη στάση ως «έγινε» στον Συνοδό αφού βρεθείς εκεί. Ένα ολοκληρωμένο ταξίδι δεν είναι επίσκεψη.',
    allHaveDoneStop:
      'Κάθε αποθηκευμένος προορισμός σε αυτά τα ταξίδια έχει ήδη στάση «έγινε» σε ανατεθειμένη μέρα.',
    planSomewhereNew:
      'Σχεδίασε κάπου νέο και ο ταξιδιωτικός σου κόσμος θα μεγαλώσει από εκεί.',
  },

  profile: {
    eyebrow: 'ΤΟ TRAVELOS ΣΟΥ',
    title: 'Προφίλ',
    subtitle: 'Η ταξιδιωτική σου ζωή, οι προτιμήσεις και οι ρυθμίσεις σε ένα μέρος.',
    travelProfileEyebrow: 'ΤΑΞΙΔΙΩΤΙΚΟ ΠΡΟΦΙΛ',
    travelProfileTitle: 'Κάνε το TravelOS να μοιάζει δικό σου.',
    travelProfileBody:
      'Το Travel DNA κρατά τις προτιμήσεις που επιλέγεις ρητά για το πώς σου αρέσει να ταξιδεύεις.',
    openTravelDna: 'Άνοιξε το Travel DNA',
    lifeEyebrow: 'Η ΤΑΞΙΔΙΩΤΙΚΗ ΣΟΥ ΖΩΗ',
    atAGlance: 'Με μια ματιά',
    tripLabel: 'Ταξίδι',
    tripsLabel: 'Ταξίδια',
    completed: 'Ολοκληρωμένα',
    mapped: 'Στον χάρτη',
    personalizeEyebrow: 'ΕΞΑΤΟΜΙΚΕΥΣΗ',
    preferences: 'Προτιμήσεις & ρυθμίσεις',

    travelDna: 'Travel DNA',
    travelDnaBody:
      'Ενδιαφέροντα, ρυθμός, στυλ ταξιδιού, στυλ προϋπολογισμού, καθημερινός ρυθμός και συνήθης παρέα.',
    savedIdeas: 'Αποθηκευμένες ιδέες',
    savedIdeasBody:
      'Προορισμοί και ιδέες διαδρομών από τον κατάλογο που κράτησες. Δεν είναι ταξίδια ούτε μέρη που επισκέφθηκες.',
    exporting: 'Προετοιμασία εξαγωγής…',
    exportBackup: 'Εξαγωγή τοπικού αντιγράφου',
    exportBody:
      'Αποθήκευσε μη κρυπτογραφημένο JSON αντίγραφο (έως 8 MiB). Μπορεί να περιέχει ιδιωτικά στοιχεία ταξιδιού: μοιράσου το μόνο εκεί που εμπιστεύεσαι. Τα αρχεία φωτογραφιών δεν περιλαμβάνονται.',
    restoring: 'Επαναφορά αντιγράφου…',
    restoreBackup: 'Επαναφορά τοπικού αντιγράφου',
    restoreBody:
      'Αντικατάστησε τα τοπικά δεδομένα με ένα JSON αντίγραφο TravelOS (έως 8 MiB). Τα αρχεία φωτογραφιών δεν επαναφέρονται· οι αναφορές φωτογραφιών μπορεί να μη δουλεύουν σε άλλη συσκευή. Επιβεβαίωσε πριν συνεχίσεις.',
    travelOsAi: 'TravelOS AI',
    travelOsAiOff: 'Το TravelOS AI είναι κλειστό',
    travelOsAiBody:
      'Grounded Travel Chat, Συνοδός ταξιδιού και βοήθεια στο Ανακάλυψε. Επιβεβαίωση πριν οτιδήποτε γίνει αλήθεια του ταξιδιού. Διακόπτης συσκευής και σημειώσεις ιδιωτικότητας μέσα.',
    probing: 'Έλεγχος συνοδού…',
    probeAi: 'Έλεγχος υγείας AI',
    probeAiBody:
      'Κάνε ping στο ρυθμισμένο TravelOS AI proxy για διαθεσιμότητα εργαλείων. Δεν γράφει δεδομένα ταξιδιού.',
    notifications: 'Ειδοποιήσεις ταξιδιού',
    notificationsBody:
      'Τοπικές υπενθυμίσεις πριν από χρονισμένες στάσεις, όταν υπάρχει αποθηκευμένη ζώνη ώρας προορισμού.',
    accountSync: 'Λογαριασμός & συγχρονισμός',
    accountSyncBody:
      'Κράτα αντίγραφα των ταξιδιών σου και συγχρόνισε το TravelOS σε συσκευές.',
    dataEyebrow: 'ΤΑ ΔΕΔΟΜΕΝΑ ΣΟΥ',
    privateByDefault: 'Ιδιωτικά εξ ορισμού',
    tripsStayWithYou: 'Τα ταξίδια σου μένουν μαζί σου.',
    privacyBody:
      'Τα ταξιδιωτικά δεδομένα αποθηκεύονται σε αυτή τη συσκευή. Η εξαγωγή και η επαναφορά χρησιμοποιούν τοπικό JSON αντίγραφο. Το TravelOS AI είναι προαιρετικό και απαιτεί επιβεβαίωση· ο συγχρονισμός στο cloud και το αντίγραφο αρχείων φωτογραφιών παραμένουν μελλοντικές, ρητές επιλογές.',

    exportSavedTitle: 'Η εξαγωγή αποθηκεύτηκε σε αυτή τη συσκευή',
    exportSavedBody: (count: number) =>
      `Γράφτηκαν ${count} ${count === 1 ? 'ταξίδι' : 'ταξίδια'} σε τοπικό αρχείο JSON. Η κοινοποίηση δεν είναι διαθέσιμη σε αυτή την πλατφόρμα.`,
    exportDialogTitle: 'Εξαγωγή τοπικού αντιγράφου TravelOS',
    exportFailed: 'Η εξαγωγή δεν ολοκληρώθηκε',
    exportFailedBody:
      'Κάτι πήγε στραβά κατά την προετοιμασία του αντιγράφου.',
    replaceTitle: 'Αντικατάσταση τοπικών δεδομένων TravelOS;',
    replaceMessage: (source: string, tripCount: number, exportedAt: string) =>
      `Αυτό αντικαθιστά κάθε ταξίδι, Travel DNA, ταξιδιώτη και αποθηκευμένη ιδέα σε αυτή τη συσκευή με «${source}» (${tripCount} ταξίδια, εξαγωγή ${exportedAt}). Οι ανοιχτοί επεξεργαστές και οι συνεδρίες αναζήτησης/chat θα μηδενιστούν. Τα αρχεία φωτογραφιών δεν επαναφέρονται. Οι ουρές ελέγχου εισαγωγής καθαρίζονται. Δεν υπάρχει αναίρεση.`,
    replaceConfirm: 'Αντικατάσταση δεδομένων',
    restoredTitle: 'Το τοπικό αντίγραφο επαναφέρθηκε',
    restoredRefreshFailed:
      'Τα δεδομένα σου επαναφέρθηκαν, αλλά οι οθόνες ή οι υπενθυμίσεις δεν ανανεώθηκαν. Κλείσε και ξανάνοιξε το TravelOS. Μην επαναλάβεις την επαναφορά.',
    restoredBody: (count: number) =>
      `Φορτώθηκαν ${count} ${count === 1 ? 'ταξίδι' : 'ταξίδια'} από το αντίγραφο σε αυτή τη συσκευή. Τα αρχεία φωτογραφιών δεν επαναφέρονται.`,
    restoreFailed: 'Η επαναφορά δεν ολοκληρώθηκε',
    restoreFailedBody: 'Το αντίγραφο δεν επαναφέρθηκε.',
  },

  travelDna: {
    title: 'Travel DNA',
    subtitle: 'Οι προτιμήσεις που επιλέγεις για το πώς σου αρέσει να ταξιδεύεις.',
    back: 'Πίσω στο Προφίλ',
    openFailed: 'Το Travel DNA δεν άνοιξε.',
    unchanged: 'Τα αποθηκευμένα δεδομένα σου δεν άλλαξαν.',

    paceEyebrow: 'ΡΥΘΜΟΣ',
    paceTitle: 'Πόσο γεμάτο πρέπει να νιώθει ένα ταξίδι;',
    chooseOne: 'Διάλεξε ένα, ή άφησέ το ανοιχτό.',
    interestsEyebrow: 'ΕΝΔΙΑΦΕΡΟΝΤΑ',
    interestsTitle: 'Τι σε τραβάει συνήθως;',
    chooseMany: 'Διάλεξε όσα θέλεις.',
    styleEyebrow: 'ΣΤΥΛ ΤΑΞΙΔΙΟΥ',
    styleTitle: 'Τοπική ζωή ή εμβληματικά μέρη;',
    budgetEyebrow: 'ΣΤΥΛ ΠΡΟΫΠΟΛΟΓΙΣΜΟΥ',
    budgetTitle: 'Πώς σου αρέσει να ξοδεύεις;',
    budgetNote: 'Αυτό είναι προτίμηση, όχι προϋπολογισμός ταξιδιού.',
    rhythmEyebrow: 'ΚΑΘΗΜΕΡΙΝΟΣ ΡΥΘΜΟΣ',
    rhythmTitle: 'Πότε νιώθεις καλύτερα στο ταξίδι;',
    partyEyebrow: 'ΣΥΝΗΘΗΣ ΠΑΡΕΑ',
    partyTitle: 'Με ποιους ταξιδεύεις συνήθως;',
    partyNote: 'Αυτό μπορεί να αλλάζει από ταξίδι σε ταξίδι.',
    save: 'Αποθήκευση Travel DNA',

    paceSlow: 'Χαλαρό',
    paceSlowBody: 'Περισσότερος χώρος να ανασάνεις',
    paceBalanced: 'Ισορροπημένο',
    paceBalancedBody: 'Ένα μελετημένο μείγμα',
    paceFull: 'Γεμάτο',
    paceFullBody: 'Αξιοποίησε κάθε μέρα στο έπακρο',

    interestFood: 'Φαγητό',
    interestCulture: 'Πολιτισμός',
    interestNature: 'Φύση',
    interestBeaches: 'Παραλίες',
    interestNightlife: 'Νυχτερινή ζωή',
    interestShopping: 'Αγορές',
    interestWellness: 'Ευεξία',
    interestAdventure: 'Περιπέτεια',

    styleLocal: 'Τοπικό',
    styleLocalBody: 'Γειτονιές και τοπική ζωή',
    styleIconic: 'Εμβληματικό',
    styleIconicBody: 'Τα απαραίτητα highlights',
    styleMix: 'Μείγμα',
    styleMixBody: 'Λίγο και από τα δύο',

    budgetValue: 'Οικονομικό',
    budgetValueBody: 'Ξόδεψε με σκέψη',
    budgetComfortable: 'Άνετο',
    budgetComfortableBody: 'Ισορροπία αξίας και άνεσης',
    budgetPremium: 'Premium',
    budgetPremiumBody: 'Προτεραιότητα στην εμπειρία',

    rhythmMorning: 'Πρωί',
    rhythmMorningBody: 'Ξεκίνα νωρίτερα',
    rhythmFlexible: 'Ευέλικτο',
    rhythmFlexibleBody: 'Άσε τη μέρα να κυλήσει',
    rhythmNight: 'Νύχτα',
    rhythmNightBody: 'Αργότερα ξεκινήματα, αργότερα τέλη',

    savedTitle: 'Το Travel DNA αποθηκεύτηκε',
    savedBody: 'Οι προτιμήσεις σου αποθηκεύτηκαν σε αυτή τη συσκευή.',
    saveFailed: 'Δεν αποθηκεύτηκε',
    saveFailedBody:
      'Το Travel DNA σου δεν αποθηκεύτηκε. Δοκίμασε ξανά.',
  },

  months: {
    january: 'Ιανουάριος',
    february: 'Φεβρουάριος',
    march: 'Μάρτιος',
    april: 'Απρίλιος',
    may: 'Μάιος',
    june: 'Ιούνιος',
    july: 'Ιούλιος',
    august: 'Αύγουστος',
    september: 'Σεπτέμβριος',
    october: 'Οκτώβριος',
    november: 'Νοέμβριος',
    december: 'Δεκέμβριος',
  },

  discoverShared: {
    goBack: 'Πίσω',
    citedSource: 'ΤΕΚΜΗΡΙΩΜΕΝΗ ΠΗΓΗ',
    makeItATrip: 'ΚΑΝ’ ΤΟ ΤΑΞΙΔΙ',
    saveIdea: 'Αποθήκευσε αυτή την ιδέα',
    removeFromSaved: 'Αφαίρεση από τις αποθηκευμένες ιδέες',
  },

  journeys: {
    title: 'Έτοιμες διαδρομές',
    intro:
      'Αυτές είναι ιδέες καταλόγου, όχι ταξίδια. Επιπλέον πόλεις μπορούν να γίνουν προορισμοί όταν δημιουργήσεις το ταξίδι. Το TravelOS δεν επινοεί πρόγραμμα ή ημερομηνίες. Τίποτα δεν αποθηκεύεται πριν επιβεβαιώσεις τη Δημιουργία ταξιδιού.',
    journeyIdea: 'ΙΔΕΑ ΔΙΑΔΡΟΜΗΣ',
    ideaNotTrip: 'ΙΔΕΑ, ΟΧΙ ΤΑΞΙΔΙ',
    primaryDestination: 'ΚΥΡΙΟΣ ΠΡΟΟΡΙΣΜΟΣ',
    alsoInThisIdea: 'ΕΠΙΣΗΣ ΣΕ ΑΥΤΗ ΤΗΝ ΙΔΕΑ',
    extraCityNote:
      'Αυτή η πόλη μπορεί να προστεθεί ως άλλος προορισμός όταν δημιουργήσεις το ταξίδι.',
    makeThisATrip: 'Κάνε αυτή την ιδέα ταξίδι',
    chooseAnother: 'Διάλεξε άλλη ιδέα',
    chooseAnotherLabel: 'Διάλεξε άλλη διαδρομή',
    saveJourneyIdea: 'Αποθήκευσε αυτή την ιδέα διαδρομής',
    removeJourneyFromSaved: 'Αφαίρεσε αυτή τη διαδρομή από τις αποθηκευμένες ιδέες',
  },

  bestTime: {
    title: 'Καλύτερη εποχή',
    intro:
      'Διάλεξε προορισμό από τον κατάλογο. Το TravelOS δείχνει μόνο μήνες που στηρίζει τεκμηριωμένη πηγή, και ποτέ δεν τους μετατρέπει σε ημερομηνίες ταξιδιού.',
    seasonAvailable: 'Υπάρχει καθοδήγηση εποχής',
    yearRoundNote: (name: string) =>
      `Επίσημες τουριστικές πηγές περιγράφουν ${name} ως επισκέψιμο όλο τον χρόνο. Αυτό δεν είναι κατατασσόμενη καλύτερη εβδομάδα, ούτε ημερομηνία ταξιδιού.`,
    noSeasonData: 'Δεν υπάρχουν ακόμα δεδομένα εποχής',
    makeThisATrip: 'Κάνε αυτόν τον προορισμό ταξίδι',
    openCreateTrip: 'Άνοιξε τη Δημιουργία ταξιδιού με αυτόν τον προορισμό',
    chooseAnother: 'Διάλεξε άλλον προορισμό',
    saveDestinationIdea: 'Αποθήκευσε αυτή την ιδέα προορισμού',
    removeDestinationFromSaved:
      'Αφαίρεσε αυτόν τον προορισμό από τις αποθηκευμένες ιδέες',
  },

  savedIdeas: {
    title: 'Αποθηκευμένες ιδέες',
    intro:
      'Αυτοί είναι υποψήφιοι που διάλεξες να κρατήσεις. Δεν είναι ταξίδια, δεν είναι μέρη που επισκέφθηκες, και δεν είναι πλάνο πριν επιβεβαιώσεις τη Δημιουργία ταξιδιού.',
    nothingSaved: 'ΤΙΠΟΤΑ ΑΠΟΘΗΚΕΥΜΕΝΟ ΑΚΟΜΑ',
    keepAnIdea: 'Κράτα εδώ έναν προορισμό ή μια ιδέα διαδρομής',
    savingNote:
      'Η αποθήκευση μιας ιδέας δεν δημιουργεί ταξίδι και δεν εμφανίζεται ως ταξιδιωτικό ιστορικό.',
    openCreateTripWithIdea: 'Άνοιξε τη Δημιουργία ταξιδιού με αυτή την ιδέα',
    noLongerInCatalogue:
      'Αυτή η ιδέα δεν μπορεί πλέον να επιβεβαιωθεί επειδή δεν είναι στον κατάλογο.',
  },

  findDestination: {
    title: 'Βρες μου έναν τόπο',
    intro:
      'Πες στο TravelOS πώς θέλεις να νιώθει αυτό το ταξίδι. Μπορείς να αφήσεις οτιδήποτε ανοιχτό και να το προσαρμόσεις αργότερα.',
    dnaHelping: 'Το Travel DNA βοηθάει',
    dnaNone: 'Δεν υπάρχει ακόμα Travel DNA',
    dnaLoading: 'Έλεγχος Travel DNA…',
    dnaHelpingBody:
      'Όπου αφήνεις αυτό το brief ανοιχτό, το TravelOS μπορεί να χρησιμοποιήσει τις προτιμήσεις που έχεις ήδη επιλέξει στο Travel DNA σου.',
    dnaNoneBody:
      'Μπορείς να χρησιμοποιήσεις κανονικά το Ανακάλυψε. Τίποτα δεν θα συναχθεί για σένα.',
    dnaLoadingBody: 'Οι αποθηκευμένες προτιμήσεις σου φορτώνονται.',

    whenEyebrow: 'ΠΟΤΕ',
    whenTitle: 'Πότε θα μπορούσες να πας;',
    whenBody:
      'Διάλεξε ακριβείς ημερομηνίες, ευέλικτο παράθυρο, ή άφησε τον χρόνο ανοιχτό.',
    notSure: 'Δεν είμαι σίγουρος/η',
    exact: 'Ακριβείς',
    flexible: 'Ευέλικτο',
    labelStartDate: 'ΗΜΕΡΟΜΗΝΙΑ ΕΝΑΡΞΗΣ',
    labelEndDate: 'ΗΜΕΡΟΜΗΝΙΑ ΛΗΞΗΣ',
    labelEarliestStart: 'ΝΩΡΙΤΕΡΗ ΕΝΑΡΞΗ',
    labelLatestEnd: 'ΑΡΓΟΤΕΡΗ ΛΗΞΗ',
    idealLength: 'ΙΔΑΝΙΚΗ ΔΙΑΡΚΕΙΑ',
    lengthPlaceholder: 'π.χ. 5 μέρες',

    budgetEyebrow: 'ΠΡΟΫΠΟΛΟΓΙΣΜΟΣ',
    budgetTitle: 'Τι σου φαίνεται άνετο;',
    budgetBody:
      'Προαιρετικό. Χρησιμοποίησε το νόμισμα με το οποίο σκέφτεσαι αυτό το ταξίδι. Το TravelOS δεν θα το μετατρέψει σιωπηλά.',
    maximum: 'ΜΕΓΙΣΤΟ',
    currency: 'ΝΟΜΙΣΜΑ',

    whyEyebrow: 'ΓΙΑΤΙ ΑΥΤΟ ΤΟ ΤΑΞΙΔΙ',
    whyTitle: 'Τι ψάχνεις;',
    whyBody:
      'Αυτές οι επιλογές αφορούν μόνο αυτό το ταξίδι. Άφησέ τες κενές για να δώσει πλαίσιο το Travel DNA όπου υπάρχει.',
    primaryIntent: 'ΚΥΡΙΑ ΠΡΟΘΕΣΗ · ΠΡΟΑΙΡΕΤΙΚΟ',
    interests: 'ΕΝΔΙΑΦΕΡΟΝΤΑ · ΠΡΟΑΙΡΕΤΙΚΟ',

    styleEyebrow: 'ΣΤΥΛ ΤΑΞΙΔΙΟΥ',
    styleTitle: 'Πώς πρέπει να νιώθει το ταξίδι;',
    styleBody: 'Οι επιλογές αυτού του ταξιδιού υπερισχύουν του γενικού Travel DNA.',
    tripPace: 'ΡΥΘΜΟΣ ΤΑΞΙΔΙΟΥ · ΠΡΟΑΙΡΕΤΙΚΟ',
    whoWith: 'ΜΕ ΠΟΙΟΥΣ ΠΑΣ; · ΠΡΟΑΙΡΕΤΙΚΟ',

    next: 'ΕΠΟΜΕΝΟ',
    findDestinations: 'Βρες προορισμούς',
    alertDatesBody: 'Διάλεξε και τις δύο ακριβείς ημερομηνίες.',
    alertBudgetBody:
      'Πρόσθεσε και ποσό και νόμισμα, ή άφησε και τα δύο κενά.',
    alertBriefTitle: 'Έλεγξε το brief του ταξιδιού',
    alertBriefBody: 'Κάποια στοιχεία του ταξιδιού θέλουν έλεγχο.',
  },

  discoverResults: {
    noBriefTitle: 'Δεν υπάρχει ακόμα brief ταξιδιού',
    noBriefBody:
      'Γύρνα πίσω και πες στο TravelOS τι είδους ταξίδι ψάχνεις.',
    returnToDiscover: 'Επιστροφή στο Ανακάλυψε',
    title: 'Τόποι που ταιριάζουν',
    subtitle:
      'Πραγματικοί προορισμοί, ταξινομημένοι ως προς τις προτιμήσεις που ξέρει το TravelOS για αυτό το ταξίδι.',
    groundedEyebrow: 'GROUNDED ΑΠΟΤΕΛΕΣΜΑΤΑ',
    groundedTitle: 'Ταξινομημένα από πραγματικούς υποψήφιους προορισμούς',
    groundedBody:
      'Αυτοί οι προορισμοί προέρχονται από τον επιμελημένο κατάλογο TravelOS. Η ρητή αντιστοίχιση προτιμήσεων προηγείται. Οι σημασιολογικές αντιστοιχίσεις, όταν υπάρχουν, μπορούν μόνο να προσθέσουν άλλους grounded τόπους του καταλόγου.',
    explicitStaysAvailable:
      'Η ρητή ταξινόμηση παραπάνω παραμένει διαθέσιμη όσο τρέχει αυτό.',
    semanticUnavailable: 'Η σημασιολογική λωρίδα δεν είναι διαθέσιμη',
    semanticUnavailableBody:
      'Η τοπική ανάκτηση δεν έτρεξε. Οι ρητές αντιστοιχίσεις σου παραπάνω δεν άλλαξαν. Τίποτα δεν επινοήθηκε ούτε αποθηκεύτηκε.',
    controlEyebrow: 'ΕΛΕΓΧΟΣ',
    controlTitle: 'Εσύ έχεις τον έλεγχο',
    controlBody:
      'Η επιλογή προορισμού απλώς προετοιμάζει το Νέο ταξίδι. Το TravelOS δεν αποθηκεύει τίποτα πριν δημιουργήσεις ρητά το ταξίδι.',

    bestMatches: 'Οι καλύτερες αντιστοιχίσεις σου',
    bestMatchesBody:
      'Διάλεξε όποιον προορισμό θες για να τον μεταφέρεις στο Νέο ταξίδι. Τίποτα δεν δημιουργείται πριν το επιβεβαιώσεις εκεί.',
    semanticTitle: 'Σημασιολογικές αντιστοιχίσεις',
    semanticBody:
      'Grounded προορισμοί καταλόγου που είναι κοντά σε νόημα με αυτό το brief. Το TravelOS δεν επινόησε αυτούς τους τόπους.',

    youToldTitle: 'Τι είπες στο TravelOS',
    youToldBody: 'Αυτές είναι ρητές επιλογές για αυτό το συγκεκριμένο ταξίδι.',
    usedTitle: 'Τι χρησιμοποίησε το TravelOS',
    usedBody:
      'Οι επιλογές του ταξιδιού έχουν προτεραιότητα. Το Travel DNA καλύπτει μόνο κενά όπου έχεις ήδη αποθηκεύσει προτίμηση.',
    timing: 'Χρόνος',
    budget: 'Προϋπολογισμός',
    primaryIntent: 'Κύρια πρόθεση',
    pace: 'Ρυθμός',
    interests: 'Ενδιαφέροντα',
    travelParty: 'Παρέα ταξιδιού',
    travelStyle: 'Στυλ ταξιδιού',
    budgetStyle: 'Στυλ προϋπολογισμού',
    dailyRhythm: 'Καθημερινός ρυθμός',
    open: 'Ανοιχτό',
    flexible: 'Ευέλικτο',

    compare: 'Σύγκριση',
    compareSelected: 'Σύγκριση επιλεγμένων προορισμών',
    compareUpToThree: 'Σύγκρινε έως τρεις grounded προορισμούς.',
    compareSelectTwoOrThree: 'Επίλεξε 2 ή 3 προορισμούς για σύγκριση.',
    compareFailed: 'Αυτοί οι προορισμοί δεν μπόρεσαν να συγκριθούν.',
    tradeoffEyebrow: 'ΣΥΓΚΡΙΣΗ ΑΝΤΙΣΤΑΘΜΙΣΕΩΝ',
    groundedOnly: 'Μόνο grounded κατάλογος',
    tradeoffBody:
      'Οι γραμμές χρησιμοποιούν το brief σου ή το Travel DNA. Όπου δεν υπάρχει τεκμήριο καταλόγου μένει «Άγνωστο» — τίποτα δεν επινοείται.',
    dimension: 'Διάσταση',
    noDimensions: 'Δεν υπάρχουν ενεργές διαστάσεις προτιμήσεων για σύγκριση.',
    close: 'Κλείσιμο',
    closeCompare: 'Κλείσε τη σύγκριση',
    match: 'Ταιριάζει',
    noMatch: 'Δεν ταιριάζει',
    unknown: 'Άγνωστο',
    semanticMatch: 'ΣΗΜΑΣΙΟΛΟΓΙΚΗ ΑΝΤΙΣΤΟΙΧΙΣΗ',
    /** rank is optional upstream; never render a placeholder number. */
    matchRank: (rank?: number) =>
      rank == null ? 'ΑΝΤΙΣΤΟΙΧΙΣΗ' : `ΑΝΤΙΣΤΟΙΧΙΣΗ #${rank}`,

    whyItFits: 'ΓΙΑΤΙ ΤΑΙΡΙΑΖΕΙ',
    noOverlap:
      'Δεν υπάρχει ακόμα ρητή επικάλυψη προτιμήσεων. Πρόσθεσε περισσότερες προτιμήσεις για να βελτιωθεί η ταξινόμηση.',
    fromCatalogue: 'ΑΠΟ ΤΟΝ ΚΑΤΑΛΟΓΟ',
    paraphraseNote:
      'Παράφραση μόνο γεγονότων καταλόγου. Τίποτα δεν αποθηκεύτηκε.',
    askAgain: 'Ρώτα ξανά',
    explainFailed:
      'Το TravelOS δεν μπόρεσε να το εξηγήσει από τον κατάλογο. Τίποτα δεν αποθηκεύτηκε.',
    tryAgain: 'Δοκίμασε ξανά',
    chooseDestination: 'Διάλεξε προορισμό',
    asking: 'Ρωτάει το TravelOS…',
    askWhyItFits: 'Ρώτα το TravelOS γιατί ταιριάζει',
    selectedForCompare: 'Επιλεγμένο για σύγκριση',
    addToCompare: 'Πρόσθεσε στη σύγκριση',

    chooseLabel: (name: string) => `Διάλεξε ${name}`,
    askAgainLabel: (name: string) =>
      `Ρώτα ξανά το TravelOS γιατί ταιριάζει ${name}`,
    retryExplainLabel: (name: string) => `Ξαναδοκίμασε την εξήγηση για ${name}`,
    askWhyLabel: (name: string) =>
      `Ρώτα το TravelOS γιατί ταιριάζει ${name}`,
    removeFromCompareLabel: (name: string) =>
      `Αφαίρεσε ${name} από τη σύγκριση`,
    addToCompareLabel: (name: string) => `Πρόσθεσε ${name} στη σύγκριση`,
  },

  importScreen: {
    eyebrow: 'ΕΛΕΓΧΟΣ ΠΡΩΤΑ',
    title: 'Εισαγωγή υλικού',
    chooseFileEyebrow: 'ΔΙΑΛΕΞΕ ΑΡΧΕΙΟ',
    chooseFileTitle:
      'Έλεγξε ένα .ics, zip, PDF, Office ή φωτογραφία επιβεβαίωσης',
    chooseFile: 'Διάλεξε αρχείο ημερολογίου',
    orPaste: 'Ή επικόλλησε κείμενο ημερολογίου',
    reviewQueue: 'ΟΥΡΑ ΕΛΕΓΧΟΥ',
    extractWithoutSaving: 'Εξαγωγή γεγονότων χωρίς αποθήκευση κρατήσεων',
    reviewEvents: 'Έλεγξε τα γεγονότα ημερολογίου',
    recentReviews: 'ΠΡΟΣΦΑΤΟΙ ΕΛΕΓΧΟΙ',
    openToReview: 'Άνοιξε για έλεγχο των εξαγόμενων καταχωρίσεων.',
    materialFailed: 'Αυτό το υλικό δεν μπόρεσε να εισαχθεί.',
    fileFailed: 'Αυτό το αρχείο δεν μπόρεσε να εισαχθεί.',
  },

  importReview: {
    eyebrow: 'ΕΙΣΑΓΟΜΕΝΕΣ ΚΑΤΑΧΩΡΙΣΕΙΣ',
    title: 'Έλεγξε πριν γίνει κράτηση',
    intro:
      'Η αποδοχή μιας καταχώρισης ημερολογίου γράφει μία σχεδιασμένη κράτηση στο ταξίδι που θα διαλέξεις. Οι καταχωρίσεις seed ανοίγουν αντί γι’ αυτό τη Δημιουργία ταξιδιού — ποτέ δεν επινοούν προορισμό ούτε γράφουν ταξίδι μόνες τους.',
    needsTripEyebrow: 'ΧΡΕΙΑΖΕΤΑΙ ΤΑΞΙΔΙ',
    createTripFirst: 'Δημιούργησε πρώτα ταξίδι',
    createTripFirstBody:
      'Οι εισαγόμενες καταχωρίσεις δεν μπορούν να επινοήσουν προορισμό ή ημερομηνίες. Επιβεβαίωσε ένα ταξίδι και μετά δέξου τα γεγονότα σε αυτό.',
    planATrip: 'Σχεδίασε ταξίδι',
    acceptOnto: 'ΑΠΟΔΟΧΗ ΣΤΟ',
    noClaims: 'Αυτό το ημερολόγιο δεν άφησε καταχωρίσεις προς έλεγχο.',
    startCreateTrip: 'Ξεκίνα τη Δημιουργία ταξιδιού',
    addAsStop: 'Πρόσθεσε ως στάση',
    editBeforeAccept: 'ΕΠΕΞΕΡΓΑΣΙΑ ΠΡΙΝ ΤΗΝ ΑΠΟΔΟΧΗ',
    optionalStayEmpty:
      'Τα προαιρετικά πεδία μένουν κενά όταν δεν τα συμπληρώσεις. Τίποτα δεν επινοείται.',
    acceptAsPlanned: 'Αποδοχή ως σχεδιασμένη κράτηση',
    dismissThisClaim: 'Απόρριψη αυτής της καταχώρισης',
    acceptedNote:
      'Έγινε δεκτή ως σχεδιασμένη κράτηση. Δεν είναι ακόμα επιβεβαιωμένη αλήθεια κράτησης.',
    reviewedNote:
      'Ελέγχθηκε. Τα canonical γεγονότα του ταξιδιού απαιτούν ακόμα Δημιουργία ταξιδιού ή Πρόγραμμα.',
    dismissedNote:
      'Απορρίφθηκε. Αυτή η καταχώριση δεν έγινε αλήθεια του ταξιδιού.',
    noDestinationYet: 'Δεν υπάρχει ακόμα προορισμός',
    noFixedTime: 'Χωρίς σταθερή ώρα',
    startUnknown: 'Άγνωστη έναρξη',
    provider: 'Πάροχος',
    confirmationCode: 'Κωδικός επιβεβαίωσης',
    bookingLink: 'Σύνδεσμος κράτησης',
    bookingLinkPlaceholder: 'Σύνδεσμος κράτησης (https://…)',
    notFound: 'Ο έλεγχος εισαγωγής δεν βρέθηκε.',
    openFailed: 'Αυτός ο έλεγχος δεν άνοιξε.',
    chooseTripFirst: 'Διάλεξε ταξίδι πριν δεχτείς μια καταχώριση.',
    claimFailed: 'Αυτή η καταχώριση δεν έγινε κράτηση.',
    seedFailed: 'Αυτή η καταχώριση seed δεν άνοιξε τη Δημιουργία ταξιδιού.',
    markFailed: 'Αυτή η γραμμή δεν σημειώθηκε ως ελεγμένη.',
    chooseTripForStop: 'Διάλεξε ταξίδι πριν προσθέσεις γραμμή ως στάση.',
    lineFailed: 'Αυτή η γραμμή δεν άνοιξε το Πρόγραμμα.',
    dismissFailed: 'Αυτή η καταχώριση δεν απορρίφθηκε.',
  },

  travelOsAi: {
    title: 'TravelOS AI',
    subtitle: 'Grounded ταξιδιωτική νοημοσύνη',
    back: 'Πίσω στο Προφίλ',
    offNotice:
      'Το TravelOS AI είναι κλειστό σε αυτή τη συσκευή. Τα αποθηκευμένα ταξίδια σου λειτουργούν κανονικά.',
    checking: 'Έλεγχος διαθεσιμότητας…',
    ready: 'Έτοιμο',
    unavailable: 'Μη διαθέσιμο',
    loadFailed: 'Δεν φορτώθηκαν οι ρυθμίσεις AI',
    loadFailedBody: 'Δοκίμασε ξανά από το Προφίλ.',
    useAi: 'Χρήση TravelOS AI',
    useAiBody:
      'Chat, εξηγήσεις AI στο Ανακάλυψε και συμβουλές ελεύθερου χρόνου. Οι προτάσεις χρειάζονται την επιβεβαίωσή σου πριν γίνουν αποθηκευμένα γεγονότα ταξιδιού. Ο χειροκίνητος σχεδιασμός παραμένει διαθέσιμος.',
    privacyContext:
      'Όταν χρησιμοποιείς AI, σχετικό πλαίσιο στέλνεται στον διακομιστή TravelOS και στον ρυθμισμένο πάροχο AI. Το chat περιλαμβάνει τα μηνύματα που γράφεις. Το Ανακάλυψε μπορεί να περιλαμβάνει το Travel DNA σου, τις προτιμήσεις αναζήτησης και τόπους του καταλόγου.',
    privacyFreeTime:
      'Οι συμβουλές ελεύθερου χρόνου μπορεί επίσης να περιλαμβάνουν ημερομηνίες ταξιδιού, ονόματα, ώρες και ακριβείς τοποθεσίες προγράμματος, τίτλους κρατήσεων, παρόχους, ποσά και κατάσταση πληρωμής, ονόματα και διευθύνσεις διαμονών και ώρες άφιξης/αναχώρησης, αριθμούς ταξιδιωτών και συνόψεις προϋπολογισμού. Το δομημένο πλαίσιο ταξιδιού εξαιρεί κωδικούς επιβεβαίωσης, στοιχεία επικοινωνίας και ελεύθερες σημειώσεις. Απόφυγε να γράφεις ευαίσθητες πληροφορίες στο chat.',
    privacyRetention:
      'Η διατήρηση και η επεξεργασία εξαρτώνται από τον ρυθμισμένο πάροχο· η μηδενική διατήρηση δεν είναι εγγυημένη. Το κλείσιμο του AI μπλοκάρει νέα αιτήματα, αλλά δεν ανακαλεί δεδομένα που έχουν ήδη σταλεί.',
    privacyServices:
      'Η διαδικτυακή αναζήτηση τόπων και οι οδηγίες είναι ξεχωριστές υπηρεσίες. Τα κλειδιά API του παρόχου μένουν στον διακομιστή.',
  },

  tripNotifications: {
    title: 'Ειδοποιήσεις ταξιδιού',
    subtitle:
      'Τοπικές υπενθυμίσεις από το αποθηκευμένο σου πρόγραμμα — ποτέ επινοημένες ώρες.',
    back: 'Πίσω στο Προφίλ',
    intro:
      'Το TravelOS μπορεί να σου θυμίσει λίγο πριν ξεκινήσει μια σχεδιασμένη στάση. Οι υπενθυμίσεις χρειάζονται αποθηκευμένη ζώνη ώρας προορισμού και χρονισμένη στάση.',
    rowTitle: 'Υπενθυμίσεις έναρξης στάσης',
    rowBody: (minutes: number) => `${minutes} λεπτά πριν από μια χρονισμένη στιγμή`,
    enableLabel: 'Ενεργοποίηση υπενθυμίσεων έναρξης στάσης',
    permissionGranted: 'Η άδεια συστήματος δόθηκε',
    permissionRequired: 'Απαιτείται άδεια συστήματος',
    refresh: 'Ανανέωση προγραμματισμένων υπενθυμίσεων',
    offTitle: 'Οι ειδοποιήσεις είναι κλειστές',
    offBody:
      'Επίτρεψε τις ειδοποιήσεις στις ρυθμίσεις συστήματος για να λαμβάνεις υπενθυμίσεις στάσεων.',
    saveFailed: 'Δεν αποθηκεύτηκε',
    saveFailedBody: 'Οι προτιμήσεις ειδοποιήσεων δεν ενημερώθηκαν.',
    loadFailed: 'Δεν φορτώθηκαν οι προτιμήσεις',
    loadFailedBody: 'Δοκίμασε ξανά σε λίγο.',
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
