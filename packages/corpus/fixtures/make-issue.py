#!/usr/bin/env python3
"""Generates the multi-instrument Gazette fixture.

Three limitations closed at once by one committed PDF.

**Segmentation had never met a real PDF.** It was tested against a hand-written
list of lines, which is a model of a document rather than a document: it proves
the boundary rules and proves nothing about column splitting, line assembly from
word-level items, or the interaction between the two. A real issue exercises the
whole path.

**A fresh clone could not rebuild anything.** Source PDFs live outside version
control for good reasons — size, and an unresolved licensing question — so every
derived artefact was unreproducible from the repository alone. That is invisible
on a machine that already has a Downloads folder full of Gazette issues, and
total in CI or a new checkout.

**And CI could not run the golden harness** for the same reason, leaving the
strongest regression check as a local-only gate.

The text is entirely invented and deliberately implausible as law — the
instruments are numbered 99/2099 and 99/01, dated in 2099, and say so. It exists
to have the *shape* of a Gazette issue, not its content: three parallel columns,
a trilingual Ibirimo index with dot leaders and lettered sections, two
instruments of different kinds, titles printed twice, recitals citing another
law, and article numbering that restarts at the second instrument.

Nothing here is copied from the Official Gazette, so the fixture carries none of
the licensing question that keeps the real corpus out of the repository.

    python3 packages/corpus/fixtures/make-issue.py
"""

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from pathlib import Path

WIDTH, HEIGHT = A4
MARGIN = 28
GUTTER = 10
COLUMNS = 3
COL_WIDTH = (WIDTH - 2 * MARGIN - (COLUMNS - 1) * GUTTER) / COLUMNS
LEADING = 11

HEADER = "Official Gazette n° 07 of 03/03/2099"

# Index entries carry dot leaders and a page number. They contain an instrument
# keyword and a law number, so they look exactly like title blocks — three per
# instrument, one per language. The dot leaders are what tells them apart.
INDEX = [
    ["Ibirimo/ Summary/ Sommaire", "page/ urup", ""],
    ["A. Amategeko/ Laws/ Lois", "", ""],
    [
        "Itegeko n° 099/2099 ryo ku wa 01/01/2099 rigenga ikizamini………2",
        "Law n° 099/2099 of 01/01/2099 governing the fixture…………………2",
        "Loi n° 099/2099 du 01/01/2099 régissant l'essai……………………2",
    ],
    ["B. Iteka rya Perezida/ Presidential Order/ Arrêté Présidentiel", "", ""],
    [
        "Iteka rya Perezida n° 099/01 ryo ku wa 02/01/2099………………5",
        "Presidential Order n° 099/01 of 02/01/2099……………………………5",
        "Arrêté Présidentiel n° 099/01 du 02/01/2099………………………5",
    ],
]

# First instrument: a law. Title in capitals, its own table of contents, the
# title again above the body, recitals citing another instrument, then articles.
LAW = [
    [
        "ITEGEKO N° 099/2099 RYO KU WA 01/01/2099 RIGENGA IKIZAMINI",
        "LAW N° 099/2099 OF 01/01/2099 GOVERNING THE FIXTURE",
        "LOI N° 099/2099 DU 01/01/2099 RÉGISSANT L'ESSAI",
    ],
    ["ISHAKIRO", "TABLE OF CONTENTS", "TABLE DES MATIÈRES"],
    [
        "Ingingo ya mbere: Icyo iri tegeko rigamije",
        "Article One: Purpose of this Law",
        "Article premier : Objet de la présente loi",
    ],
    [
        "Ingingo ya 2: Ibisobanuro by'amagambo",
        "Article 2: Definitions of terms",
        "Article 2 : Définitions des termes",
    ],
    [
        "ITEGEKO N° 099/2099 RYO KU WA 01/01/2099 RIGENGA IKIZAMINI",
        "LAW N° 099/2099 OF 01/01/2099 GOVERNING THE FIXTURE",
        "LOI N° 099/2099 DU 01/01/2099 RÉGISSANT L'ESSAI",
    ],
    [
        "Twebwe, UMUGENZUZI W'IKIZAMINI, Perezida w'ikizamini;",
        "We, THE FIXTURE AUTHOR, President of the fixture;",
        "Nous, L'AUTEUR DE L'ESSAI, Président de l'essai ;",
    ],
    # A recital citing another instrument. Instrument keyword plus law number,
    # in sentence case — the case segmentation must not treat as a boundary.
    [
        "Isubiye ku Itegeko Ngenga n° 007/2018.OL ryo ku wa 08/09/2018;",
        "Having reviewed Organic Law n° 007/2018.OL of 08/09/2018;",
        "Revu la Loi Organique n° 007/2018.OL du 08/09/2018 ;",
    ],
    [
        "Ishingiye ku Itegeko Nshinga rya Repubulika y'u Rwanda;",
        "Pursuant to the Constitution of the Republic of Rwanda;",
        "Vu la Constitution de la République du Rwanda ;",
    ],
    [
        "Ingingo ya mbere: Icyo iri tegeko rigamije",
        "Article One: Purpose of this Law",
        "Article premier : Objet de la présente loi",
    ],
    [
        "(1) Iri tegeko rigenga ikizamini cy'imikorere y'ikoranabuhanga "
        "kandi ntirigira icyo rihindura ku mategeko nyayo y'u Rwanda.",
        "(1) This Law governs a software fixture and has no effect whatsoever "
        "on the actual laws of Rwanda. It exists only for testing purposes.",
        "(1) La présente loi régit un essai logiciel et n'a aucun effet sur "
        "les lois réelles du Rwanda. Elle existe uniquement pour des essais.",
    ],
    [
        "Ingingo ya 2: Ibisobanuro by'amagambo",
        "Article 2: Definitions of terms",
        "Article 2 : Définitions des termes",
    ],
    [
        "(1) Muri iri tegeko, ijambo ikizamini risobanura inyandiko "
        "yakozwe kugira ngo igenzure porogaramu kandi itari itegeko.",
        "(1) In this Law, the term fixture means a document created in order "
        "to verify a program, and which is not a law of any kind.",
        "(1) Dans la présente loi, le terme essai désigne un document créé "
        "afin de vérifier un programme, et qui n'est pas une loi.",
    ],
    [
        "Ingingo ya 3: Igihe itegeko ritangira gukurikizwa",
        "Article 3: Entry into force",
        "Article 3 : Entrée en vigueur",
    ],
    [
        "(1) Iri tegeko ritangira gukurikizwa ku munsi ritangarijweho mu "
        "Igazeti ya Leta ya Repubulika y'u Rwanda.",
        "(1) This Law comes into force on the date of its publication in the "
        "Official Gazette of the Republic of Rwanda.",
        "(1) La présente loi entre en vigueur le jour de sa publication au "
        "Journal Officiel de la République du Rwanda.",
    ],
]

# Second instrument: an order. Its number is serial/category — 099/01, where 01
# identifies the issuing authority and is not a year. Article numbering restarts.
ORDER = [
    [
        "ITEKA RYA PEREZIDA N° 099/01 RYO KU WA 02/01/2099 RIGENA IKIZAMINI",
        "PRESIDENTIAL ORDER N° 099/01 OF 02/01/2099 DETERMINING THE FIXTURE",
        "ARRÊTÉ PRÉSIDENTIEL N° 099/01 DU 02/01/2099 DÉTERMINANT L'ESSAI",
    ],
    [
        "Twebwe, UMUGENZUZI W'IKIZAMINI, Perezida w'ikizamini;",
        "We, THE FIXTURE AUTHOR, President of the fixture;",
        "Nous, L'AUTEUR DE L'ESSAI, Président de l'essai ;",
    ],
    [
        "Ishingiye ku Itegeko n° 099/2099 ryo ku wa 01/01/2099;",
        "Pursuant to Law n° 099/2099 of 01/01/2099;",
        "Vu la Loi n° 099/2099 du 01/01/2099 ;",
    ],
    [
        "Ingingo ya mbere: Icyo iri teka rigamije",
        "Article One: Purpose of this Order",
        "Article premier : Objet du présent arrêté",
    ],
    [
        "(1) Iri teka rigena uburyo ikizamini gikorwa kandi nta gaciro "
        "rifite ku mategeko nyayo y'u Rwanda.",
        "(1) This Order determines how the fixture is carried out and has no "
        "bearing on the actual laws of Rwanda.",
        "(1) Le présent arrêté détermine les modalités de l'essai et n'a "
        "aucune incidence sur les lois réelles du Rwanda.",
    ],
    [
        "Ingingo ya 2: Ivanwaho ry'ingingo zinyuranyije n'iri teka",
        "Article 2: Repealing provision",
        "Article 2 : Disposition abrogatoire",
    ],
    [
        "(1) Ingingo zose z'amabwiriza abanziriza iri teka kandi zinyuranyije "
        "na ryo zivanyweho.",
        "(1) All prior provisions contrary to this Order are repealed.",
        "(1) Toutes les dispositions antérieures contraires au présent arrêté "
        "sont abrogées.",
    ],
]


def wrap(text, width_chars):
    words, lines, current = text.split(), [], ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if len(candidate) > width_chars and current:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines


def render(path):
    pdf = canvas.Canvas(str(path), pagesize=A4)
    # Columns are laid out left to right as Kinyarwanda, English, French — the
    # Gazette's usual order. The parser must not rely on that: it classifies each
    # column by content, and this fixture is what proves the two agree.
    x = [MARGIN + i * (COL_WIDTH + GUTTER) for i in range(COLUMNS)]
    width_chars = int(COL_WIDTH / 4.1)
    y = HEIGHT - MARGIN

    def new_page():
        nonlocal y
        pdf.showPage()
        y = HEIGHT - MARGIN
        pdf.setFont("Helvetica-Oblique", 7)
        pdf.drawString(MARGIN, HEIGHT - 18, HEADER)

    pdf.setFont("Helvetica-Oblique", 7)
    pdf.drawString(MARGIN, HEIGHT - 18, HEADER)
    y -= 24

    for block in INDEX + LAW + ORDER:
        wrapped = [wrap(cell, width_chars) if cell else [] for cell in block]
        height = max(len(w) for w in wrapped) * LEADING + 4
        if y - height < MARGIN + 20:
            new_page()
            y -= 24

        # Title blocks are set in bold capitals; body text is not. That contrast
        # is the signal segmentation uses to tell a title from a recital that
        # merely cites another law.
        bold = block[0].isupper() and len(block[0]) > 20
        pdf.setFont("Helvetica-Bold" if bold else "Helvetica", 8)

        for column, lines in enumerate(wrapped):
            for row, line in enumerate(lines):
                pdf.drawString(x[column], y - row * LEADING, line)
        y -= height

    pdf.save()


if __name__ == "__main__":
    out = Path(__file__).parent / "gazette-issue-2099.pdf"
    render(out)
    print(f"wrote {out} ({out.stat().st_size} bytes)")
