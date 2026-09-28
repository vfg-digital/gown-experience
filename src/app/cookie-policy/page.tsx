import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy — Valentino Rêverie",
  description: "Cookie policy",
};

/**
 * Pagina della Cookie Policy.
 *
 * Il testo e riportato alla lettera dal documento approvato
 * (Cookie Policy/Gowns Cookie Policy.docx). Non va riscritto ne riassunto:
 * qualsiasi variazione va richiesta a chi lo ha approvato.
 *
 * Non e protetta da password di proposito: un'informativa deve essere
 * consultabile. Si apre in una nuova scheda dal link in fondo alle schermate.
 */
export default function CookiePolicyPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Intestazione con il solo logo: la pagina si apre in una scheda a se,
          quindi non serve navigazione verso il resto del sito. */}
      <header className="flex items-center justify-center h-14 border-b border-black/5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-valentino.svg" alt="Valentino" className="h-5 md:h-7 w-auto" />
      </header>

      <article className="max-w-2xl mx-auto px-6 md:px-10 py-12 md:py-16">
        <h1 className="font-serif text-3xl md:text-4xl font-normal leading-tight mb-10">
          Cookie policy
        </h1>

        <section className="space-y-3 mb-10">
          <h2 className="font-sans text-[11px] font-medium uppercase tracking-[0.15em] text-black">
            What is a cookie and what are they used for?
          </h2>
          <p className="font-sans text-[12px] md:text-[13px] text-black/75 leading-[1.75]">
            A cookie is a small data file which, in the form of a unique anonymous code, is sent to
            your browser from a web server and then stored on the hard disk of your device
            (computer, smart-phone and/or tablet). Cookies may allow the correct use of an internet
            site (so-called technical or necessary cookies), or they may act as checks of the
            User&apos;s preferences in the context of the latter&apos;s online navigation in order
            to propose advertising messages (so-called profiling cookies). Cookies may be stored
            permanently on the device for a period of variable duration (so-called permanent
            cookies), or they may be deleted on the closure of the browser or be of limited duration
            (so-called session cookies). Cookies may be installed by the website you are visiting
            (so-called first party cookies) or may be installed by other websites (so-called
            third-party cookies).
          </p>
        </section>

        <section className="space-y-3 mb-10">
          <h2 className="font-sans text-[11px] font-medium uppercase tracking-[0.15em] text-black">
            The cookies used on this website and the purposes of such use
          </h2>
          <p className="font-sans text-[12px] md:text-[13px] text-black/75 leading-[1.75]">
            This Website uses the following cookies:
          </p>

          <h3 className="font-serif text-lg md:text-xl font-normal pt-4">
            Necessary/Technical cookies
          </h3>
          <p className="font-sans text-[12px] md:text-[13px] text-black/75 leading-[1.75]">
            These cookies allow the Website to function correctly making it possible to view its
            contents in the related language and market from the User&apos;s first visit, then this
            is the purpose of said necessary technical cookies. They are able to recognize the
            country from which User is making the connection and ensure that the User is
            automatically orientated to the version of the Website applicable for his or her country
            on each visit. These cookies are necessary for the functioning of the Website.
          </p>

          <h3 className="font-serif text-lg md:text-xl font-normal pt-4">List of cookies</h3>
          <p className="font-sans text-[12px] md:text-[13px] text-black/75 leading-[1.75]">
            A cookie is a small amount of data (a text file) that a website, asks the browser to
            store on the device when visited by a user in order to remember their information, such
            as their preferred language or login details. These cookies are set by us and called
            first-party cookies. We also use third-party cookies (cookies from a domain other than
            the website you are visiting) for advertising and marketing purposes. In particular, we
            use cookies and other tracking technologies for these purposes:
          </p>

          {/* Tabella dal documento approvato. La prima colonna e' unita sulle
              tre righe, come nell'originale. */}
          <div className="overflow-x-auto pt-4">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <caption className="sr-only">Cookies used on this Website</caption>
              <thead>
                <tr className="border-b border-black/15">
                  {["Cookie Subgroup", "Cookies", "Purpose", "Cookies used", "Lifespan"].map(
                    (heading) => (
                      <th
                        key={heading}
                        scope="col"
                        className="font-sans text-[10px] font-medium uppercase tracking-[0.1em] text-black py-2.5 pr-4 align-bottom"
                      >
                        {heading}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="font-sans text-[11px] md:text-[12px] text-black/75">
                <tr className="border-b border-black/8">
                  <th
                    scope="row"
                    rowSpan={3}
                    className="font-normal text-black/75 py-3 pr-4 align-top"
                  >
                    *.valentino.com
                  </th>
                  <td className="py-3 pr-4 align-top">Browser Language</td>
                  <td className="py-3 pr-4 align-top">Default language</td>
                  <td className="py-3 pr-4 align-top">First Party</td>
                  <td className="py-3 pr-4 align-top">Session</td>
                </tr>
                <tr className="border-b border-black/8">
                  <td className="py-3 pr-4 align-top">
                    Operating system, browser type and version
                  </td>
                  <td className="py-3 pr-4 align-top">VCard download and QR code render</td>
                  <td className="py-3 pr-4 align-top">First Party</td>
                  <td className="py-3 pr-4 align-top">Session</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 align-top">Viewport dimension</td>
                  <td className="py-3 pr-4 align-top">Responsiveness app</td>
                  <td className="py-3 pr-4 align-top">First Party</td>
                  <td className="py-3 pr-4 align-top">Session</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="font-serif text-lg md:text-xl font-normal pt-6">Analytic Cookies</h3>
          <p className="font-sans text-[12px] md:text-[13px] text-black/75 leading-[1.75]">
            These cookies are used to create statistical analyses on the manner in which Users
            navigate the Website, for example the device used, the number of pages visited or the
            number of clicks on a particular page during navigation. The results of these analyses
            are processed in an anonymous way and only for statistics purposes. Then statistical
            aggregated analysis about the use of the Website is the purposes of the processing. We
            only use cookies which track anonymous IP addresses (with a portion of the code not
            visible); such cookies are assimilated to technical cookies as they do not allow any
            users identification and they do not need any consent to be used.
          </p>
        </section>

        <section className="space-y-3 mb-10">
          <h2 className="font-sans text-[11px] font-medium uppercase tracking-[0.15em] text-black">
            Data retention
          </h2>
          <p className="font-sans text-[12px] md:text-[13px] text-black/75 leading-[1.75]">
            Please note that the lifespan of each cookie is indicated within the tables above. The
            data collected by the cookies will be retained by the Data Controller for a maximum of
            37 months and then cancelled or anonymized.
          </p>
        </section>

        <section className="space-y-3 mb-10">
          <h2 className="font-sans text-[11px] font-medium uppercase tracking-[0.15em] text-black">
            Legal basis for the use of cookies
          </h2>
          <p className="font-sans text-[12px] md:text-[13px] text-black/75 leading-[1.75]">
            Consent is not required for the use of technical cookies (including anonymized
            analytical cookies); they are thus processed on the basis of the owner&apos;s legitimate
            interest to provide improved navigation and use of the Website.
          </p>
        </section>

        <section className="space-y-3 mb-10">
          <h2 className="font-sans text-[11px] font-medium uppercase tracking-[0.15em] text-black">
            How your personal data are processed
          </h2>
          <p className="font-sans text-[12px] md:text-[13px] text-black/75 leading-[1.75]">
            Your personal data will be processed by automated tools for the time strictly necessary
            to achieve the purposes for which such data were collected (please see the specific
            cookie duration on the tables above and the DATA RETENTION section above). Specific
            security, technical and organizational measures have been adopted to prevent the loss of
            data, illicit or incorrect use and unauthorized access.
          </p>
        </section>

        <section className="space-y-3 mb-10">
          <h2 className="font-sans text-[11px] font-medium uppercase tracking-[0.15em] text-black">
            Users right to oppose or edit cookies
          </h2>
          <p className="font-sans text-[12px] md:text-[13px] text-black/75 leading-[1.75]">
            You can oppose the storage of cookies on your hard disk by configuring your browser in
            such a way as to deactivate cookies. We have set out below the procedures available in
            the main browsers:
          </p>
          <ul className="font-sans text-[12px] md:text-[13px] text-black/75 leading-[1.75] space-y-2 pl-5 list-disc">
            <li>
              Chrome:{" "}
              <a
                href="https://support.google.com/chrome/answer/95647?hl=it"
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-black/25 underline-offset-2 hover:text-black break-all"
              >
                https://support.google.com/chrome/answer/95647?hl=it
              </a>
            </li>
            <li>
              Firefox:{" "}
              <a
                href="https://support.mozilla.org/it/kb/Gestione%20dei%20cookie"
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-black/25 underline-offset-2 hover:text-black break-all"
              >
                https://support.mozilla.org/it/kb/Gestione%20dei%20cookie
              </a>
            </li>
            <li>
              Safari:{" "}
              <a
                href="http://support.apple.com/kb/HT1677?viewlocale=it_IT"
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-black/25 underline-offset-2 hover:text-black break-all"
              >
                http://support.apple.com/kb/HT1677?viewlocale=it_IT
              </a>
            </li>
          </ul>
          <p className="font-sans text-[12px] md:text-[13px] text-black/75 leading-[1.75]">
            It is possible, however, that after completing the above operation a number of the web
            page functions may not work properly.
          </p>
        </section>

        <section className="space-y-3 mb-10">
          <h2 className="font-sans text-[11px] font-medium uppercase tracking-[0.15em] text-black">
            Data controller
          </h2>
          <p className="font-sans text-[12px] md:text-[13px] text-black/75 leading-[1.75]">
            The data controller of data collected by cookies is Valentino S.p.A. with registered
            office in Via Turati 16/18, 20121, Milano (MI), Italia. Valentino S.p.A. has appointed a
            data protection officer, who can be contacted at the following e-mail address{" "}
            <a
              href="mailto:privacy@valentino.com"
              className="underline decoration-black/25 underline-offset-2 hover:text-black"
            >
              privacy@valentino.com
            </a>
            . For any information regarding the processing of your personal data, to complain and to
            exercise the rights set out below, you can also contact the data controller writing to
            Valentino, via Turati 16/18, 20121 Milano (at the attention of the Legal Department,
            which is appointed to receive and manage such requests, also involving the relevant
            departments, as per the internal Valentino procedures).
          </p>
        </section>

        <section className="space-y-3 mb-10">
          <h2 className="font-sans text-[11px] font-medium uppercase tracking-[0.15em] text-black">
            Who will obtain knowledge of the data, their transfer and disclosure
          </h2>
          <p className="font-sans text-[12px] md:text-[13px] text-black/75 leading-[1.75]">
            The data acquired by cookies will and may come to the knowledge of the following:
          </p>
          <ul className="font-sans text-[12px] md:text-[13px] text-black/75 leading-[1.75] space-y-2 pl-5 list-disc">
            <li>
              Employees and collaborators of the controller, acting in the capacity of person
              authorized to effect processing; and,
            </li>
            <li>
              Suppliers of technical and organizational services acting in the capacity of
              processors.
            </li>
          </ul>
          <p className="font-sans text-[12px] md:text-[13px] text-black/75 leading-[1.75]">
            We may transfer the data acquired by the use of cookies abroad including to countries
            outside the EU, with the guarantee nonetheless, of appropriate protections and defenses.
            To obtain information on the exact location of the data you are invited to write to the
            controller at{" "}
            <a
              href="mailto:privacy@valentino.com"
              className="underline decoration-black/25 underline-offset-2 hover:text-black"
            >
              privacy@valentino.com
            </a>
            .
          </p>
          <p className="font-sans text-[12px] md:text-[13px] text-black/75 leading-[1.75]">
            The data will not be disclosed generally in any way.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-sans text-[11px] font-medium uppercase tracking-[0.15em] text-black">
            Users rights
          </h2>
          <p className="font-sans text-[12px] md:text-[13px] text-black/75 leading-[1.75]">
            The user always has the right to obtain from VALENTINO confirmation of whether or not
            personal data concerning him/her exists, even if it is not yet recorded, and to have it
            communicated to him/her in an intelligible form. A user also has the right to obtain
            information about the source of personal data; the purposes and methods of processing
            it, the logic applied in the event of processing that is performed with the aid of
            electronic instruments; the identification details of the controller and data
            processors; and indication of the persons or categories of persons whose personal data
            may be communicated. A user also has the right to request an update, correction or, when
            s/he has an interest in doing so, an inclusion of personal data, deletion, conversion to
            an anonymous form or the blocking of personal data, that has been processed in violation
            of the law, including data which it is not necessary to keep in relation to the purposes
            for which it was collected or subsequently processed; a statement that the above
            operations were disclosed, including in terms of their content, to those parties to whom
            the data was communicated, except in the case in which such performance proves
            impossible or entails the use of methods that are clearly disproportionate to the right
            protected. The user can also ask for the portability of his/her data. Moreover, the user
            has the right to ask restriction of processing of his/her personal data.
          </p>
          <p className="font-sans text-[12px] md:text-[13px] text-black/75 leading-[1.75]">
            A user nevertheless has the right to object, in part or in full, for legitimate reasons,
            the processing of personal data concerning him/her, even if it is pertinent to the scope
            of the collection.
          </p>
          <p className="font-sans text-[12px] md:text-[13px] text-black/75 leading-[1.75]">
            You can exercise the above rights and ask information and further questions about the
            processing of your Personal Data by contacting VALENTINO and the Data Protection Officer
            writing to{" "}
            <a
              href="mailto:privacy@valentino.com"
              className="underline decoration-black/25 underline-offset-2 hover:text-black"
            >
              privacy@valentino.com
            </a>{" "}
            (please note that the delivery of an email request entails the subsequent acquisition of
            the sender&apos;s address, necessary to respond to requests and keep track of them, as
            well as any other personal data included in the electronic communication, for legal
            purposes). You can also write by mail at VALENTINO, via Turati 16/18, 20121, Milano
            (Italy), at the attention of the Legal Department.
          </p>
          <p className="font-sans text-[12px] md:text-[13px] text-black/75 leading-[1.75]">
            Please finally note that you have the right to lodge a complaint with the Italian Data
            Protection Authority (Garante per la Protezione dei Dati Personali), based in Piazza
            Venezia, 11, 00187 Rome (
            <a
              href="http://www.garanteprivacy.it/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-black/25 underline-offset-2 hover:text-black"
            >
              www.garanteprivacy.it
            </a>
            ), or with another data protection supervisory authority in the Country in which you
            reside.
          </p>
        </section>
      </article>
    </main>
  );
}
