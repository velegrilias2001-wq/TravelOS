# Editor safety — R2 working matrix

Updated 2026-09-09. This is a scoped verification record, not completion of R2 or an all-platform usability claim. Android checks used `com.travelos.app.hardening` on the connected emulator and a known synthetic trip; the original app/data was untouched. The fixture and temporary harness were cleaned.

## Contract

SQLite remains durable truth. `useEditorCloseGuard` snapshots only editable local form values when a modal opens. Unchanged forms close directly; changed forms require Keep editing/Discard; saving blocks user exits. Successful saves retain their existing direct-close path. `useRouteEditorGuard` additionally protects route removal through Expo Router's supported React Navigation entry point, including removal of a parent stack. A retained tab blur is not removal and leaves the draft intact. Save resets the baseline; Create Trip schedules its successful exit after lifting prevention. Cancellation does not write records. This is not autosave or process-death recovery.

| Editor | Implemented boundary | Evidence in this pass | Still to verify/implement |
| --- | --- | --- | --- |
| Plan | Existing dedicated dirty-draft guard | Earlier Android create/edit/discard checkpoint retained; not rerun here | Wider picker/navigation/failure matrix |
| Bookings | Modal Back/X; all editable fields, temporal drafts, links and payment flag | Existing booking status changed; X warned; Keep editing retained editor; Android Back warned again; Discard left saved confirmed status/title/USD unchanged | Full failed-save, nested picker and successful edit-save scenarios |
| Planned Budget | Back/X and currency-settings exit | Entered 100; currency exit warned; Keep editing retained 100; X/Discard returned to no-budget state without creating a budget | Confirmed discard-to-currency navigation, save failure |
| Expenses | Back/X; amount/currency/category/date/notes and explicit IDs | Android changed category; empty-title save rejected with clear validation; Back still warned and discard created no expense | Successful expense edit/save, injected database failure and nested picker checks remain |
| Accommodation | Back/X and complete editable draft | Unchanged X closed without warning; changed type/X warned; Discard left no stay. X overlap with Android status bar reproduced visually, corrected and retested | Native date/location/link picker return, edit/failed-save paths |
| Travelers | Back/X including identity/contact/type fields | Choose → create → type change → Android Back warned; Discard left no traveler membership. Final safe-area X follow-up: below system bar, unchanged modal closed directly | Reusable edit/link/save-failure cases |
| Memories | Back/X including text, links and pending-photo/remove-photo state | Typed note → keyboard dismissal → Android Back warned; Keep editing preserved text; scrolled to Save and saved successfully without discard prompt; note appeared in list | Photo permission/picker cancellation, edit/remove-photo and failure paths |
| Create Trip | Route-removal guard, complete local draft; successful creation explicitly releases guard before replace | Android date-picker Cancel retained dates; previous-step and Keep editing retained intent; Discard left zero trips. Normal Save created the trip/two days/EUR 100 budget and opened Copilot without warning | Database-save failure, nested location/traveler picker and rapid-action cases |
| Trip Details | Route-removal guard with normalized saved baseline; saving/deleting blocks exits | Android changed status; retained navigation followed by parent Back warned; discard left saved data intact | Native baseline after save, failure and explicit deletion interaction |
| Travel Book | Route-removal guard; dirty draft is not rehydrated on workspace refresh | Android unsaved summary survived Plan/tab return; parent Back warned; discard left no saved book | Native successful save baseline, selected-memory deletion while dirty and failed-save cases |
| Inline FX | Route-removal guard and save-in-progress state; successful save resets baseline | Android invalid rate rejected; USD draft retained through Plan/tab return; Back/Discard wrote no rate. Synthetic 0.9 USD→EUR saved; Back then exited without warning. Rate survived cold relaunch and normal More → Budget navigation | Injected persistence failure, rapid actions and iOS navigation |

Three pure policy tests cover unchanged populated/new forms, changed fields (including relationships/media), missing baseline and save-in-progress blocking. They do not render React Native or replace the Android checks above. Full app suite: 442 passing tests at the final local checkpoint. A EUR 100 planned budget also saved in the native pass; no real trip data was used.

## Native layout correction

Accommodation, Travelers and Memories use `ModalSafeArea`: a modal-local SafeAreaProvider and SafeAreaView, following [Expo SDK 57 safe-area guidance](https://docs.expo.dev/versions/v57.0.0/sdk/safe-area-context/). No hard-coded status-bar height, new dependency or schema change. The provider measures the modal's own window, including iOS page sheets; iOS behavior is not verified on Windows. Android Accommodation X moved below the system bar; Memory Save remained reachable by scrolling. Booking/Budget X controls now have button roles and descriptive accessibility labels.

## Remaining acceptance gates

- Follow-up cold relaunch encountered an Android **System UI isn't responding** dialog, recovered via Wait/reopening without resetting data. Bootstrap and persistence then passed, but delayed UI transitions mean this is not cold-start/performance certification. Original app untouched; exact synthetic fixture deleted, related trip/day/destination/budget/expense/FX counts zero; temporary harness removed. Existing DateTimePicker `onChange` deprecation warning remains maintenance work, not a failure observed in picker cancellation.

- The new route guard addresses actual removal for the four route editors above. Modal `onRequestClose` alone does not cover forced external route unmount; rapid repeated actions and iOS swipe dismissal still need dedicated verification.
- Failed-save draft retention must be tested per flow; no new code clears drafts on failure, but code inspection is not a native failure rehearsal.
- TalkBack focus/announcements, large-font clipping, keyboard variants, gesture navigation and reduced motion remain the R3 matrix. Existing pale status-bar content and muted-text contrast need review; this pass is not an accessibility certification.
- Process death, OS eviction and autosaved draft recovery are an explicit future decision; nothing here persists unconfirmed facts.
