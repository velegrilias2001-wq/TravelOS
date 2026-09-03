const assert = require('node:assert/strict');
const test = require('node:test');

const {
  MEMORY_MEDIA_CONTRACT,
  collectOwnedMemoryUris,
  collectOwnedMemoryUrisFromRecords,
  isOwnedMemoryMediaUri,
  memoryMediaExportRefusal,
  ownedMemoryMediaPrefix,
  replacedOwnedMemoryUri,
} = require('../.test-build/src/services/memory-media-ownership.js');

const DOCUMENT_DIRECTORY = 'file:///app-files/';
const OWNED_URI =
  'file:///app-files/travelos/memories/photo-1.jpg';
const GALLERY_URI =
  'file:///storage/DCIM/Camera/IMG_1001.jpg';

test('owned memory prefix lives under app document storage', () => {
  assert.equal(
    ownedMemoryMediaPrefix(DOCUMENT_DIRECTORY),
    'file:///app-files/travelos/memories/',
  );
  assert.equal(
    ownedMemoryMediaPrefix('file:///app-files'),
    'file:///app-files/travelos/memories/',
  );
});

test('gallery originals and unknown storage are not owned copies', () => {
  assert.equal(
    isOwnedMemoryMediaUri(OWNED_URI, DOCUMENT_DIRECTORY),
    true,
  );
  assert.equal(
    isOwnedMemoryMediaUri(GALLERY_URI, DOCUMENT_DIRECTORY),
    false,
  );
  assert.equal(
    isOwnedMemoryMediaUri(
      'content://media/external/images/media/12',
      DOCUMENT_DIRECTORY,
    ),
    false,
  );
  assert.equal(
    isOwnedMemoryMediaUri(OWNED_URI, null),
    false,
  );
  assert.equal(
    isOwnedMemoryMediaUri(OWNED_URI, ''),
    false,
  );
});

test('path traversal and nested paths fail closed', () => {
  assert.equal(
    isOwnedMemoryMediaUri(
      'file:///app-files/travelos/memories/../secret.jpg',
      DOCUMENT_DIRECTORY,
    ),
    false,
  );
  assert.equal(
    isOwnedMemoryMediaUri(
      'file:///app-files/travelos/memories/nested/photo.jpg',
      DOCUMENT_DIRECTORY,
    ),
    false,
  );
  assert.equal(
    isOwnedMemoryMediaUri(
      'file:///app-files/travelos/memories/photo\\escape.jpg',
      DOCUMENT_DIRECTORY,
    ),
    false,
  );
  assert.equal(
    isOwnedMemoryMediaUri(
      'file:///app-files/travelos/memories/',
      DOCUMENT_DIRECTORY,
    ),
    false,
  );
});

test('trip delete collects owned copies and leaves gallery originals', () => {
  assert.deepEqual(
    collectOwnedMemoryUrisFromRecords(
      [
        { mediaUri: OWNED_URI },
        { mediaUri: GALLERY_URI },
        { mediaUri: OWNED_URI },
        { mediaUri: undefined },
        {},
      ],
      DOCUMENT_DIRECTORY,
    ),
    [OWNED_URI],
  );
  assert.deepEqual(
    collectOwnedMemoryUris(
      [OWNED_URI, GALLERY_URI],
      null,
    ),
    [],
  );
});

test('replacing a photo discards only the previous owned copy', () => {
  assert.equal(
    replacedOwnedMemoryUri(
      OWNED_URI,
      'file:///app-files/travelos/memories/photo-2.jpg',
      DOCUMENT_DIRECTORY,
    ),
    OWNED_URI,
  );
  assert.equal(
    replacedOwnedMemoryUri(
      OWNED_URI,
      OWNED_URI,
      DOCUMENT_DIRECTORY,
    ),
    undefined,
  );
  assert.equal(
    replacedOwnedMemoryUri(
      GALLERY_URI,
      OWNED_URI,
      DOCUMENT_DIRECTORY,
    ),
    undefined,
  );
});

test('memory media contract refuses backup, export, and video authoring', () => {
  assert.equal(MEMORY_MEDIA_CONTRACT.owner, 'app-document-copy');
  assert.equal(MEMORY_MEDIA_CONTRACT.keepsGalleryOriginal, true);
  assert.equal(MEMORY_MEDIA_CONTRACT.backup, 'none');
  assert.equal(MEMORY_MEDIA_CONTRACT.exportAvailable, false);
  assert.equal(MEMORY_MEDIA_CONTRACT.offline, 'local-copy');
  assert.equal(MEMORY_MEDIA_CONTRACT.videoAuthoring, false);

  const refusal = memoryMediaExportRefusal();

  assert.equal(refusal.available, false);
  assert.match(refusal.reason, /does not export or back up/i);
  assert.match(refusal.reason, /this device/i);
});
