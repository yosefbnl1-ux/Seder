# Seder

- `index.html` - סידור עמדות מערך חוץ
- `report/` - טופס העברת משמרת (בדיקת תקינות רכב ואמצעים) + אתר מנהל

## טופס העברת משמרת

| דף | כתובת (ב-GitHub Pages) | למי |
|---|---|---|
| הטופס | `https://yosefbnl1-ux.github.io/Seder/report/` | המאבטחים - את הקישור הזה הופכים לברקוד |
| אתר המנהל | `https://yosefbnl1-ux.github.io/Seder/report/admin.html` | מנהלים בלבד (כניסה עם אימייל וסיסמה) |

באתר המנהל: רשימת כל הדוחות שמתעדכנת בזמן אמת, סינון לפי תאריך/משמרת/ליקויים, חיפוש לפי רכב או שם,
צפייה בדוח מלא כולל חתימות, הורדת PDF (דוח בודד, דוחות שנבחרו או כל הרשימה המסוננת - קובץ אחד, דוח לכל עמוד),
הדפסה, ייצוא לאקסל (CSV) ומחיקה.

### מצב ניסיון
כל עוד `report/config.js` לא מוגדר, הדוחות נשמרים רק בדפדפן שבו מילאו אותם, ואתר המנהל מציג רק אותם.
זה טוב לבדיקה בלבד.

### הפעלה אמיתית (Firebase, חינם) - פעם אחת, כ-10 דקות
1. נכנסים ל-https://console.firebase.google.com ויוצרים פרויקט חדש (אפשר לבטל את Google Analytics).
2. **Build > Firestore Database > Create database** - מיקום `eur3 (europe-west)`, מצב Production.
3. בלשונית **Rules** של Firestore מדביקים את התוכן של `report/firestore.rules`,
   מחליפים את `admin@example.com` באימייל/ים של המנהלים, ולוחצים Publish.
4. **Build > Authentication > Get started > Email/Password > Enable**.
   בלשונית **Users > Add user** יוצרים משתמש לכל מנהל (אימייל + סיסמה).
5. **Project settings (גלגל השיניים) > Your apps > סמל `</>`** - רושמים אפליקציית Web,
   ומעתיקים את האובייקט `firebaseConfig` לתוך `report/config.js` במקום `null`.
6. ב-**Authentication > Settings > Authorized domains** מוסיפים `yosefbnl1-ux.github.io`.

אחרי זה כל דוח שנשלח מכל טלפון מגיע לאתר המנהל. אם אין קליטה בזמן השליחה, הדוח נשמר בטלפון
ונשלח אוטומטית כשהחיבור חוזר.
