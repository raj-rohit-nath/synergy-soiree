\# Synergy Soiree – Event Management Suite



A lightweight, zero-cost event management system built for \*\*Synergy Soiree\*\*, a corporate networking event with \~70 invited guests. It covers the full guest journey, \*\*registration → check-in → feedback\*\*, using three Google Apps Script web apps backed by Google Sheets and Google Drive.



No servers, no hosting fees, no database setup. Everything runs on Google Workspace.



\---



\## Highlights



\- \*\*Company-based seat quotas.\*\* Invitations were issued per company (1–3 seats each). The registration app enforces each company's limit automatically, so no company can go over its allotted seats.

\- \*\*QR-powered check-in.\*\* Guests scan a QR code at the venue and get a personal itinerary for the event, where they can mark each activity as done.

\- \*\*Post-event feedback with photo uploads.\*\* Guests can submit feedback and upload their event photos, which are saved straight to Google Drive.

\- \*\*Everything lands in Google Sheets\*\*, so organizers can monitor registrations and check-ins live without any extra tools.



\---



\## The Three Apps



\### 1. Registration (`/registration`)

Collects guest details:

\- Company name (with per-company seat limits)

\- Full name and phone number

\- T-shirt size

\- Food preference

\- National ID (NID) photo upload



\### 2. QR Check-in (`/qr-checkin`)

Scanned by guests at the venue. Shows the event itinerary step by step and lets guests mark activities as completed.



\### 3. Feedback (`/feedback`)

Post-event form for ratings and comments, with optional photo uploads to a shared Drive folder.



\---



\## Tech Stack



| Layer | Technology |

|-------|-----------|

| Backend | Google Apps Script (`Code.gs`) |

| Frontend | HTML, CSS, JavaScript (`Index.html`, served via `HtmlService`) |

| Database | Google Sheets |

| File storage | Google Drive |

| Hosting | Apps Script Web App deployments |



\---



\## Project Structure



```

synergy-soiree/

├── registration/

│   ├── Code.gs

│   ├── Index.html

│   └── appsscript.json

├── qr-checkin/

│   ├── Code.gs

│   └── Index.html

└── feedback/

&#x20;   ├── Code.gs

&#x20;   └── Index.html

```



\---



\## Screenshots



\_Coming soon.\_



\---



\## Setup (to run your own copy)



Repeat these steps for each of the three apps:



1\. Create a new \*\*Google Sheet\*\* (this will hold the app's data).

2\. In the Sheet, go to \*\*Extensions → Apps Script\*\*.

3\. Replace the default `Code.gs` content with the `Code.gs` from this repo's folder.

4\. Click \*\*+ → HTML\*\*, name the file `Index`, and paste in `Index.html`.

5\. For \*\*registration\*\* only: enable \*\*Project Settings → Show "appsscript.json"\*\* and replace its contents with this repo's `appsscript.json`.

6\. In `Code.gs`, replace the placeholder values (Sheet IDs / Drive folder IDs) with your own.

7\. Click \*\*Deploy → New deployment → Web app\*\*:

&#x20;  - \*Execute as:\* \*\*Me\*\*

&#x20;  - \*Who has access:\* \*\*Anyone\*\*

8\. Authorize the permissions when prompted, then open the Web App URL.



\---



\## Privacy Note



The registration app collects phone numbers and national ID images. In this repository, \*\*all real Sheet IDs, Drive folder IDs, and guest data have been removed\*\*. If you deploy your own copy, store uploads in a Drive folder with restricted sharing and delete personal data once the event is over.



\---



\## Author



\*\*RAJ ROHIT NATH\*\*: \[GitHub](https://github.com/raj-rohit-nath) · \[LinkedIn](https://www.linkedin.com/in/raj-rohit-nath-5b8735218/)

