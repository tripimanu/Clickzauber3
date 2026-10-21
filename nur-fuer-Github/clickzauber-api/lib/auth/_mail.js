// E-Mails der Anmeldung an einer Stelle — gleicher Ton, gleiche Absenderadresse.
//
// Jede Mail geht in zwei Fassungen raus: HTML mit sichtbarem Knopf und blauem
// Link, dazu derselbe Text ohne Formatierung. Das hat zwei Gründe. Erstens
// bewerten Gmail, Outlook und GMX eine Mail ohne HTML-Teil als auffällig — sie
// landet dann im Junk-Ordner. Zweitens erkennt ein Mail-Programm einen Link nur
// dann als Link, wenn er wirklich einer ist; im reinen Text steht er grau und
// niemand traut sich, darauf zu klicken.
import { MAIL_KEY, MAIL_FROM, MAIL_TO } from '../_lib.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* Ein Rahmen für alle Anmelde-Mails: Marke, Überschrift, Text, Knopf, darunter
   der Link im Klartext und in Blau — falls der Knopf nicht anklickbar ist. */
function rahmen({ titel, absaetze, knopfText, link, fuss, l = 'de' }) {
  const t = M[spr(l)];
  const text = absaetze
    .map((a) => `<p style="color:#3a352a;font-size:15px;line-height:1.65;margin:0 0 14px">${esc(a)}</p>`)
    .join('');
  return `<!DOCTYPE html><html lang="${spr(l)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(titel)}</title></head>
<body style="margin:0;background:#f3ede2;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3ede2;padding:26px 14px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid #e3dbcd;border-radius:16px;overflow:hidden">
<tr><td style="padding:22px 26px 0">
  <div style="font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:#2f7d59">clickzauber</div>
  <h1 style="font-size:20px;font-weight:600;color:#211d16;margin:10px 0 14px;letter-spacing:-.01em">${esc(titel)}</h1>
</td></tr>
<tr><td style="padding:0 26px 4px">
  ${text}
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0 8px"><tr>
    <td align="center" bgcolor="#2f7d59" style="background:#2f7d59;border-radius:10px;mso-padding-alt:14px 24px">
      <a href="${esc(link)}" target="_blank" rel="noopener" style="display:block;padding:14px 24px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;line-height:20px;mso-line-height-rule:exactly;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">${esc(knopfText)}</a>
    </td>
  </tr></table>
  <p style="color:#615c50;font-size:13px;line-height:1.6;margin:14px 0 0">
    ${esc(t.knopfHilfe)}<br>
    <a href="${esc(link)}" target="_blank" rel="noopener" style="color:#1155cc;text-decoration:underline;word-break:break-all;font-size:13px">${esc(link)}</a>
  </p>
</td></tr>
<tr><td style="padding:18px 26px;background:#fbf8f3;border-top:1px solid #e3dbcd;color:#968f80;font-size:12px;line-height:1.55">
  ${esc(fuss)}<br>
  ${esc(t.mensch)}
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

async function senden(to, subject, html, text) {
  if (!MAIL_KEY) { console.info('[auth] Mail an', to, '—', subject, '\n', text); return true; }
  const { Resend } = await import('resend');
  const resend = new Resend(MAIL_KEY);
  await resend.emails.send({ from: MAIL_FROM, to, subject, html, text, replyTo: MAIL_TO });
  return true;
}

export function bestaetigungsMail(to, link) {
  const absaetze = [
    'Willkommen bei clickzauber. Ein Klick fehlt noch: bestätigen Sie, dass diese Adresse Ihnen gehört.',
    'Danach ist Ihr Konto vollständig angelegt, und Sie melden sich mit Ihrer E-Mail-Adresse und Ihrem Passwort an — ein Code ist nicht mehr nötig.'
  ];
  const fuss = 'Der Link gilt 48 Stunden. Wenn Sie sich nicht angemeldet haben, ignorieren Sie diese E-Mail einfach — es passiert dann nichts.';
  return senden(
    to,
    'Ihre E-Mail-Adresse bestätigen',
    rahmen({ titel: 'E-Mail-Adresse bestätigen', absaetze, knopfText: 'E-Mail-Adresse bestätigen', link, fuss }),
    absaetze.join('\n\n') + '\n\n' + link + '\n\n' + fuss
  );
}

const LOC = { de: 'de-DE', sq: 'sq-AL', en: 'en-GB', fr: 'fr-FR', it: 'it-IT', es: 'es-ES', tr: 'tr-TR' };
const spr = (l) => (LOC[l] ? l : 'de');
const tagLang = (d, l) => new Date(String(d).slice(0, 10) + 'T12:00:00Z').toLocaleDateString(LOC[spr(l)], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Berlin' });

/* Texte für Mails an den Betrieb. Registrierung und Bestätigung bleiben deutsch,
   weil auch Anmeldeseite und AGB deutsch sind. Übersetzt ist, was ein bestehender
   Kunde bekommt: Übergabe, Passwort, Erinnerung vor Ablauf der kostenlosen Zeit. */
const M = {
  de: {
    knopfHilfe: 'Falls der Knopf nicht reagiert, kopieren Sie diese Adresse in Ihren Browser:',
    mensch: 'Sie können auf diese E-Mail direkt antworten — sie erreicht einen Menschen.',
    ue_betreff: 'Ihr clickzauber-Zugang ist bereit', ue_titel: 'Ihr Zugang ist bereit', ue_knopf: 'Passwort festlegen',
    ue_1: (f) => 'Ihr Anfrage-Formular' + (f ? ' für ' + f : '') + ' ist eingerichtet und läuft.',
    ue_2: 'Mit dem Knopf unten legen Sie Ihr eigenes Passwort fest. Danach gehört der Zugang Ihnen: Sie sehen alle Anfragen im Cockpit und können das Formular jederzeit selbst ändern.',
    ue_3: (t) => 'Die Nutzung ist für Sie bis zum ' + t + ' kostenlos. Zwei Wochen vorher erinnern wir Sie.',
    ue_fuss: 'Der Link gilt sieben Tage und lässt sich einmal verwenden. Ist er abgelaufen, wählen Sie bei der Anmeldung „Passwort vergessen“ und geben diese Adresse ein.',
    ko_betreff: (t) => 'Ihre kostenlose Zeit endet am ' + t, ko_titel: (t) => 'Kostenlos bis ' + t, ko_knopf: 'Tarif wählen',
    ko_1: (t) => 'Ihr Anfrage-Formular läuft noch bis zum ' + t + ' kostenlos.',
    ko_2: (t) => 'Damit es danach ohne Unterbrechung weiterläuft, wählen Sie jetzt einen Tarif. Abgebucht wird erst nach dem ' + t + '.',
    ko_3: 'Wählen Sie keinen Tarif, wird das Formular danach ausgeblendet. Ihre bisherigen Anfragen bleiben im Cockpit.',
    ko_fuss: 'Monatlich kündbar.',
    pw_betreff: 'Neues Passwort für clickzauber', pw_titel: 'Neues Passwort setzen', pw_knopf: 'Neues Passwort setzen',
    pw_1: 'Sie haben ein neues Passwort für clickzauber angefordert.',
    pw_2: 'Mit dem Knopf unten setzen Sie es. Der Link gilt zwei Stunden und lässt sich nur einmal verwenden.',
    pw_fuss: 'Wenn Sie das nicht waren, ignorieren Sie diese E-Mail — Ihr bisheriges Passwort bleibt gültig.'
  },
  en: {
    knopfHilfe: 'If the button does not work, copy this address into your browser:',
    mensch: 'You can reply to this email directly — it reaches a person. Support is in German.',
    ue_betreff: 'Your clickzauber access is ready', ue_titel: 'Your access is ready', ue_knopf: 'Set password',
    ue_1: (f) => 'Your enquiry form' + (f ? ' for ' + f : '') + ' is set up and running.',
    ue_2: 'Use the button below to set your own password. After that the access is yours: you see all enquiries in the dashboard and can change the form yourself at any time.',
    ue_3: (t) => 'You can use it free of charge until ' + t + '. We will remind you two weeks before.',
    ue_fuss: 'The link is valid for seven days and can be used once. If it has expired, choose “Forgot password” when signing in and enter this address.',
    ko_betreff: (t) => 'Your free period ends on ' + t, ko_titel: (t) => 'Free until ' + t, ko_knopf: 'Choose a plan',
    ko_1: (t) => 'Your enquiry form runs free of charge until ' + t + '.',
    ko_2: (t) => 'To keep it running without interruption, choose a plan now. You will only be charged after ' + t + '.',
    ko_3: 'If you do not choose a plan, the form will be hidden afterwards. Your previous enquiries stay in the dashboard.',
    ko_fuss: 'Cancel monthly.',
    pw_betreff: 'New password for clickzauber', pw_titel: 'Set a new password', pw_knopf: 'Set new password',
    pw_1: 'You have requested a new password for clickzauber.',
    pw_2: 'Use the button below to set it. The link is valid for two hours and can only be used once.',
    pw_fuss: 'If this was not you, ignore this email — your current password stays valid.'
  },
  sq: {
    knopfHilfe: 'Nëse butoni nuk funksionon, kopjojeni këtë adresë në shfletues:',
    mensch: 'Mund t\'i përgjigjeni drejtpërdrejt këtij email-i — e lexon një njeri. Mbështetja është në gjermanisht.',
    ue_betreff: 'Qasja juaj në clickzauber është gati', ue_titel: 'Qasja juaj është gati', ue_knopf: 'Vendosni fjalëkalimin',
    ue_1: (f) => 'Formulari juaj i kërkesave' + (f ? ' për ' + f : '') + ' është gati dhe funksionon.',
    ue_2: 'Me butonin më poshtë vendosni fjalëkalimin tuaj. Pas kësaj qasja është e juaja: shihni të gjitha kërkesat në panel dhe mund ta ndryshoni formularin vetë në çdo kohë.',
    ue_3: (t) => 'Përdorimi është falas për ju deri më ' + t + '. Dy javë më parë do t\'ju kujtojmë.',
    ue_fuss: 'Lidhja vlen shtatë ditë dhe mund të përdoret një herë. Nëse ka skaduar, zgjidhni „Keni harruar fjalëkalimin?“ te hyrja dhe shkruani këtë adresë.',
    ko_betreff: (t) => 'Periudha juaj falas mbaron më ' + t, ko_titel: (t) => 'Falas deri më ' + t, ko_knopf: 'Zgjidhni tarifën',
    ko_1: (t) => 'Formulari juaj funksionon falas deri më ' + t + '.',
    ko_2: (t) => 'Që të vazhdojë pa ndërprerje, zgjidhni tani një tarifë. Pagesa merret vetëm pas ' + t + '.',
    ko_3: 'Nëse nuk zgjidhni tarifë, formulari fshihet më pas. Kërkesat e deritanishme mbeten në panel.',
    ko_fuss: 'Mund ta anuloni çdo muaj.',
    pw_betreff: 'Fjalëkalim i ri për clickzauber', pw_titel: 'Vendosni një fjalëkalim të ri', pw_knopf: 'Vendos fjalëkalimin e ri',
    pw_1: 'Keni kërkuar një fjalëkalim të ri për clickzauber.',
    pw_2: 'Me butonin më poshtë e vendosni. Lidhja vlen dy orë dhe mund të përdoret vetëm një herë.',
    pw_fuss: 'Nëse nuk e keni kërkuar ju, injorojeni këtë email — fjalëkalimi juaj i tanishëm mbetet i vlefshëm.'
  },
  fr: {
    knopfHilfe: 'Si le bouton ne fonctionne pas, copiez cette adresse dans votre navigateur :',
    mensch: 'Vous pouvez répondre directement à cet e-mail — il est lu par une personne. L’assistance est en allemand.',
    ue_betreff: 'Votre accès clickzauber est prêt', ue_titel: 'Votre accès est prêt', ue_knopf: 'Définir le mot de passe',
    ue_1: (f) => 'Votre formulaire de demande' + (f ? ' pour ' + f : '') + ' est configuré et fonctionne.',
    ue_2: 'Avec le bouton ci-dessous, vous définissez votre propre mot de passe. Ensuite, l’accès vous appartient : vous voyez toutes les demandes dans le tableau de bord et pouvez modifier le formulaire vous-même à tout moment.',
    ue_3: (t) => 'L’utilisation est gratuite pour vous jusqu’au ' + t + '. Nous vous le rappellerons deux semaines avant.',
    ue_fuss: 'Le lien est valable sept jours et ne peut être utilisé qu’une fois. S’il a expiré, choisissez « Mot de passe oublié » lors de la connexion et saisissez cette adresse.',
    ko_betreff: (t) => 'Votre période gratuite se termine le ' + t, ko_titel: (t) => 'Gratuit jusqu’au ' + t, ko_knopf: 'Choisir un forfait',
    ko_1: (t) => 'Votre formulaire de demande fonctionne gratuitement jusqu’au ' + t + '.',
    ko_2: (t) => 'Pour qu’il continue sans interruption, choisissez dès maintenant un forfait. Le prélèvement n’a lieu qu’après le ' + t + '.',
    ko_3: 'Si vous ne choisissez pas de forfait, le formulaire sera ensuite masqué. Vos demandes précédentes restent dans le tableau de bord.',
    ko_fuss: 'Résiliable chaque mois.',
    pw_betreff: 'Nouveau mot de passe pour clickzauber', pw_titel: 'Définir un nouveau mot de passe', pw_knopf: 'Définir un nouveau mot de passe',
    pw_1: 'Vous avez demandé un nouveau mot de passe pour clickzauber.',
    pw_2: 'Avec le bouton ci-dessous, vous le définissez. Le lien est valable deux heures et ne peut être utilisé qu’une seule fois.',
    pw_fuss: 'Si ce n’était pas vous, ignorez cet e-mail — votre mot de passe actuel reste valable.'
  },
  it: {
    knopfHilfe: 'Se il pulsante non funziona, copi questo indirizzo nel Suo browser:',
    mensch: 'Può rispondere direttamente a questa e-mail — la legge una persona. L\'assistenza è in tedesco.',
    ue_betreff: 'Il Suo accesso a clickzauber è pronto', ue_titel: 'Il Suo accesso è pronto', ue_knopf: 'Imposta la password',
    ue_1: (f) => 'Il Suo modulo di richiesta' + (f ? ' per ' + f : '') + ' è configurato e attivo.',
    ue_2: 'Con il pulsante qui sotto imposta la Sua password. Da quel momento l\'accesso è Suo: vede tutte le richieste nel pannello e può modificare il modulo in qualsiasi momento.',
    ue_3: (t) => 'L\'utilizzo è gratuito per Lei fino al ' + t + '. Glielo ricorderemo due settimane prima.',
    ue_fuss: 'Il link è valido sette giorni e si può usare una sola volta. Se è scaduto, scelga «Password dimenticata» all\'accesso e inserisca questo indirizzo.',
    ko_betreff: (t) => 'Il Suo periodo gratuito termina il ' + t, ko_titel: (t) => 'Gratis fino al ' + t, ko_knopf: 'Scegli un piano',
    ko_1: (t) => 'Il Suo modulo di richiesta è gratuito fino al ' + t + '.',
    ko_2: (t) => 'Perché continui a funzionare senza interruzioni, scelga ora un piano. L\'addebito avviene solo dopo il ' + t + '.',
    ko_3: 'Se non sceglie un piano, il modulo verrà poi nascosto. Le Sue richieste precedenti restano nel pannello.',
    ko_fuss: 'Disdicibile ogni mese.',
    pw_betreff: 'Nuova password per clickzauber', pw_titel: 'Imposta una nuova password', pw_knopf: 'Imposta nuova password',
    pw_1: 'Ha richiesto una nuova password per clickzauber.',
    pw_2: 'Con il pulsante qui sotto la imposta. Il link è valido due ore e si può usare una sola volta.',
    pw_fuss: 'Se non è stato Lei, ignori questa e-mail — la Sua password attuale resta valida.'
  },
  es: {
    knopfHilfe: 'Si el botón no funciona, copie esta dirección en su navegador:',
    mensch: 'Puede responder directamente a este correo — lo lee una persona. La asistencia es en alemán.',
    ue_betreff: 'Su acceso a clickzauber está listo', ue_titel: 'Su acceso está listo', ue_knopf: 'Establecer contraseña',
    ue_1: (f) => 'Su formulario de solicitudes' + (f ? ' para ' + f : '') + ' está configurado y funcionando.',
    ue_2: 'Con el botón de abajo establece su propia contraseña. A partir de ahí el acceso es suyo: ve todas las solicitudes en el panel y puede cambiar el formulario usted mismo en cualquier momento.',
    ue_3: (t) => 'El uso es gratuito para usted hasta el ' + t + '. Se lo recordaremos dos semanas antes.',
    ue_fuss: 'El enlace es válido siete días y solo se puede usar una vez. Si ha caducado, elija «¿Olvidó su contraseña?» al iniciar sesión e introduzca esta dirección.',
    ko_betreff: (t) => 'Su periodo gratuito termina el ' + t, ko_titel: (t) => 'Gratis hasta el ' + t, ko_knopf: 'Elegir un plan',
    ko_1: (t) => 'Su formulario de solicitudes funciona gratis hasta el ' + t + '.',
    ko_2: (t) => 'Para que siga funcionando sin interrupción, elija ahora un plan. El cobro se realiza después del ' + t + '.',
    ko_3: 'Si no elige ningún plan, el formulario se ocultará después. Sus solicitudes anteriores se quedan en el panel.',
    ko_fuss: 'Cancelable cada mes.',
    pw_betreff: 'Nueva contraseña para clickzauber', pw_titel: 'Establecer una nueva contraseña', pw_knopf: 'Establecer nueva contraseña',
    pw_1: 'Ha solicitado una nueva contraseña para clickzauber.',
    pw_2: 'Con el botón de abajo la establece. El enlace es válido dos horas y solo se puede usar una vez.',
    pw_fuss: 'Si no ha sido usted, ignore este correo — su contraseña actual sigue siendo válida.'
  },
  tr: {
    knopfHilfe: 'Düğme çalışmazsa bu adresi tarayıcınıza kopyalayın:',
    mensch: 'Bu e-postayı doğrudan yanıtlayabilirsiniz — bir insan okur. Destek Almanca verilir.',
    ue_betreff: 'clickzauber erişiminiz hazır', ue_titel: 'Erişiminiz hazır', ue_knopf: 'Şifre belirle',
    ue_1: (f) => (f ? f + ' için t' : 'T') + 'alep formunuz kuruldu ve çalışıyor.',
    ue_2: 'Aşağıdaki düğmeyle kendi şifrenizi belirlersiniz. Sonrasında erişim sizindir: tüm talepleri panelde görür ve formu istediğiniz zaman kendiniz değiştirebilirsiniz.',
    ue_3: (t) => 'Kullanım sizin için ' + t + ' tarihine kadar ücretsizdir. İki hafta önce size hatırlatacağız.',
    ue_fuss: 'Bağlantı yedi gün geçerlidir ve yalnızca bir kez kullanılabilir. Süresi dolduysa girişte „Şifremi unuttum“ seçeneğini seçip bu adresi girin.',
    ko_betreff: (t) => 'Ücretsiz döneminiz ' + t + ' tarihinde bitiyor', ko_titel: (t) => t + ' tarihine kadar ücretsiz', ko_knopf: 'Tarife seç',
    ko_1: (t) => 'Talep formunuz ' + t + ' tarihine kadar ücretsiz çalışıyor.',
    ko_2: (t) => 'Kesintisiz devam etmesi için şimdi bir tarife seçin. Ödeme ancak ' + t + ' tarihinden sonra alınır.',
    ko_3: 'Tarife seçmezseniz form daha sonra gizlenir. Önceki talepleriniz panelde kalır.',
    ko_fuss: 'Aylık olarak iptal edilebilir.',
    pw_betreff: 'clickzauber için yeni şifre', pw_titel: 'Yeni şifre belirleyin', pw_knopf: 'Yeni şifre belirle',
    pw_1: 'clickzauber için yeni bir şifre talep ettiniz.',
    pw_2: 'Aşağıdaki düğmeyle belirleyebilirsiniz. Bağlantı iki saat geçerlidir ve yalnızca bir kez kullanılabilir.',
    pw_fuss: 'Bu talebi siz yapmadıysanız bu e-postayı dikkate almayın — mevcut şifreniz geçerliliğini korur.'
  }
};

/* Vorgebauter Zugang geht an den Kunden: er legt sein eigenes Passwort fest,
   das des Betreibers kennt er nie — und umgekehrt. */
export function uebergabeMail(to, link, { firma, bis, l } = {}) {
  l = spr(l); const t = M[l];
  const absaetze = [t.ue_1(firma), t.ue_2];
  if (bis) absaetze.push(t.ue_3(tagLang(bis, l)));
  return senden(to, t.ue_betreff,
    rahmen({ titel: t.ue_titel, absaetze, knopfText: t.ue_knopf, link, fuss: t.ue_fuss, l }),
    absaetze.join('\n\n') + '\n\n' + link + '\n\n' + t.ue_fuss);
}

export function kostenlosEndetMail(to, bis, link, l) {
  l = spr(l); const t = M[l], tag = tagLang(bis, l);
  const absaetze = [t.ko_1(tag), t.ko_2(tag), t.ko_3];
  return senden(to, t.ko_betreff(tag),
    rahmen({ titel: t.ko_titel(tag), absaetze, knopfText: t.ko_knopf, link, fuss: t.ko_fuss, l }),
    absaetze.join('\n\n') + '\n\n' + link + '\n\n' + t.ko_fuss);
}

export function passwortMail(to, link, l) {
  l = spr(l); const t = M[l];
  const absaetze = [t.pw_1, t.pw_2];
  return senden(to, t.pw_betreff,
    rahmen({ titel: t.pw_titel, absaetze, knopfText: t.pw_knopf, link, fuss: t.pw_fuss, l }),
    absaetze.join('\n\n') + '\n\n' + link + '\n\n' + t.pw_fuss);
}
