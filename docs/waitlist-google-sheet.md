# Waitlist → Google Sheet setup

The "Join Waitlist" form POSTs to `/api/waitlist`, which forwards the email to a
Google Apps Script web app that appends a row to a Google Sheet.

## 1. Create the sheet

1. Create a new Google Sheet.
2. In the first sheet, add a header row: `Timestamp` in A1, `Email` in B1.
3. (Optional) rename that tab to `Waitlist`.

## 2. Add the Apps Script

In the sheet: **Extensions → Apps Script**, replace the contents with:

```js
function doPost(e) {
  // Serialize so two near-simultaneous submits can't both slip past the dupe check.
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var data = JSON.parse(e.postData.contents);
    var email = (data.email || '').toString().trim();
    if (!email) {
      return json({ ok: false, error: 'invalid-email' });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Waitlist') || ss.getSheets()[0];

    // Reject if the email is already in column B (case-insensitive).
    var last = sheet.getLastRow();
    if (last >= 2) {
      var existing = sheet.getRange(2, 2, last - 1, 1).getValues();
      var needle = email.toLowerCase();
      for (var i = 0; i < existing.length; i++) {
        if (String(existing[i][0]).trim().toLowerCase() === needle) {
          return json({ ok: false, error: 'duplicate' });
        }
      }
    }

    sheet.appendRow([new Date(), email]);
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

## 3. Deploy it

1. **Deploy → New deployment → Web app**.
2. **Execute as:** Me.
3. **Who has access:** Anyone.
4. Deploy, authorize, and copy the **Web app URL** (ends in `/exec`).

## 4. Wire up the env var

Add the URL to `.env.local` (and your hosting provider's env settings):

```
WAITLIST_WEBHOOK_URL=https://script.google.com/macros/s/AKfyc.../exec
```

Restart `npm run dev` after changing env vars. That's it — submissions now land
in the sheet.
