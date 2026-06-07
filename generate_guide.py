#!/usr/bin/env python3
"""Generate CasaOS user guide PDF using reportlab."""

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm, mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether, PageBreak
)
from reportlab.platypus.flowables import Flowable
from reportlab.graphics.shapes import Drawing, Rect, Circle, String, Line, Polygon
from reportlab.graphics import renderPDF
from reportlab.pdfgen import canvas
import os

# ── Colour palette ──────────────────────────────────────────────────────────
BG_DARK   = colors.HexColor("#0f0f0f")
BG_CARD   = colors.HexColor("#1a1a1a")
BG_CARD2  = colors.HexColor("#242424")
AMBER     = colors.HexColor("#fbbf24")
AMBER_DIM = colors.HexColor("#d97706")
WHITE     = colors.HexColor("#ffffff")
GRAY      = colors.HexColor("#9ca3af")
GRAY_DIM  = colors.HexColor("#6b7280")
GREEN     = colors.HexColor("#4ade80")
BLUE      = colors.HexColor("#60a5fa")
PURPLE    = colors.HexColor("#a78bfa")
RED       = colors.HexColor("#f87171")
ORANGE    = colors.HexColor("#fb923c")
PINK      = colors.HexColor("#f472b6")

PAGE_W, PAGE_H = A4


# ── Custom flowables ─────────────────────────────────────────────────────────
class ColoredBox(Flowable):
    """Rounded colored box with optional title and content lines."""
    def __init__(self, title, lines, accent=AMBER, width=None, icon=None):
        self.title = title
        self.lines = lines
        self.accent = accent
        self.width = width or (PAGE_W - 4*cm)
        self.icon = icon
        line_h = 18
        self.height = 40 + len(lines) * line_h + 10
        super().__init__()

    def draw(self):
        w, h = self.width, self.height
        # background
        d = self.canv
        d.setFillColor(BG_CARD)
        d.roundRect(0, 0, w, h, 8, fill=1, stroke=0)
        # left accent bar
        d.setFillColor(self.accent)
        d.roundRect(0, 0, 5, h, 3, fill=1, stroke=0)
        # title
        d.setFillColor(self.accent)
        d.setFont("Helvetica-Bold", 11)
        if self.icon:
            d.drawString(16, h - 22, f"{self.icon}  {self.title}")
        else:
            d.drawString(16, h - 22, self.title)
        # divider
        d.setStrokeColor(BG_CARD2)
        d.line(16, h - 30, w - 10, h - 30)
        # content lines
        y = h - 48
        for line in self.lines:
            d.setFillColor(WHITE)
            d.setFont("Helvetica", 9)
            if line.startswith("•"):
                d.setFillColor(self.accent)
                d.circle(22, y + 3, 2, fill=1, stroke=0)
                d.setFillColor(WHITE)
                d.drawString(30, y, line[1:].strip())
            elif line.startswith("→"):
                d.setFillColor(self.accent)
                d.drawString(16, y, "→")
                d.setFillColor(GRAY)
                d.drawString(28, y, line[1:].strip())
            else:
                d.setFillColor(GRAY)
                d.drawString(16, y, line)
            y -= 18

    def wrap(self, availW, availH):
        return self.width, self.height


class FeatureRow(Flowable):
    """Two-column feature highlight row."""
    def __init__(self, left_icon, left_title, left_desc,
                 right_icon, right_title, right_desc, width=None):
        self.data = [
            (left_icon, left_title, left_desc),
            (right_icon, right_title, right_desc),
        ]
        self.width = width or (PAGE_W - 4*cm)
        self.height = 80
        super().__init__()

    def draw(self):
        w, h = self.width, self.height
        col_w = (w - 10) / 2
        d = self.canv
        for i, (icon, title, desc) in enumerate(self.data):
            x = i * (col_w + 10)
            d.setFillColor(BG_CARD)
            d.roundRect(x, 0, col_w, h, 6, fill=1, stroke=0)
            d.setFillColor(AMBER)
            d.setFont("Helvetica-Bold", 18)
            d.drawString(x + 10, h - 30, icon)
            d.setFillColor(WHITE)
            d.setFont("Helvetica-Bold", 10)
            d.drawString(x + 10, h - 48, title)
            # wrap desc
            d.setFillColor(GRAY)
            d.setFont("Helvetica", 8)
            words = desc.split()
            line, y = "", h - 62
            for w_word in words:
                test = (line + " " + w_word).strip()
                if d.stringWidth(test, "Helvetica", 8) < col_w - 20:
                    line = test
                else:
                    d.drawString(x + 10, y, line)
                    y -= 12
                    line = w_word
            if line:
                d.drawString(x + 10, y, line)

    def wrap(self, availW, availH):
        return self.width, self.height


class NavBar(Flowable):
    """Mobile bottom navigation bar mockup."""
    def __init__(self, width=None, active=0):
        self.width = width or (PAGE_W - 4*cm)
        self.height = 64
        self.active = active
        super().__init__()

    def draw(self):
        w, h = self.width, self.height
        d = self.canv
        items = [
            ("⌂", "Inicio"),
            ("▦", "Agenda"),
            ("🍽", "Recetas"),
            ("🛒", "Compras"),
            ("₿", "Finanzas"),
            ("◈", "Proyectos"),
        ]
        d.setFillColor(BG_CARD)
        d.roundRect(0, 0, w, h, 10, fill=1, stroke=0)
        col_w = w / len(items)
        for i, (icon, label) in enumerate(items):
            cx = i * col_w + col_w / 2
            if i == self.active:
                d.setFillColor(AMBER)
                d.roundRect(cx - 22, 6, 44, h - 12, 8, fill=1, stroke=0)
                d.setFillColor(BG_DARK)
            else:
                d.setFillColor(GRAY_DIM)
            d.setFont("Helvetica-Bold", 14)
            d.drawCentredString(cx, h - 26, icon)
            d.setFont("Helvetica", 7)
            if i == self.active:
                d.setFillColor(BG_DARK)
            else:
                d.setFillColor(GRAY_DIM)
            d.drawCentredString(cx, 10, label)

    def wrap(self, availW, availH):
        return self.width, self.height


class SectionHeader(Flowable):
    """Section header with icon and gradient-style background."""
    def __init__(self, icon, title, subtitle, accent=AMBER, width=None):
        self.icon = icon
        self.title = title
        self.subtitle = subtitle
        self.accent = accent
        self.width = width or (PAGE_W - 4*cm)
        self.height = 70
        super().__init__()

    def draw(self):
        w, h = self.width, self.height
        d = self.canv
        # gradient-ish background
        d.setFillColor(BG_CARD)
        d.roundRect(0, 0, w, h, 10, fill=1, stroke=0)
        # accent left strip
        d.setFillColor(self.accent)
        d.roundRect(0, 0, 6, h, 4, fill=1, stroke=0)
        # icon circle
        d.setFillColor(self.accent)
        d.circle(35, h/2, 18, fill=1, stroke=0)
        d.setFillColor(BG_DARK)
        d.setFont("Helvetica-Bold", 16)
        d.drawCentredString(35, h/2 - 6, self.icon)
        # title
        d.setFillColor(WHITE)
        d.setFont("Helvetica-Bold", 16)
        d.drawString(62, h/2 + 4, self.title)
        # subtitle
        d.setFillColor(GRAY)
        d.setFont("Helvetica", 10)
        d.drawString(62, h/2 - 14, self.subtitle)

    def wrap(self, availW, availH):
        return self.width, self.height


class MobileScreen(Flowable):
    """Simplified mobile screen mockup."""
    def __init__(self, title, items, accent=AMBER, width=None, tab_labels=None, active_tab=0):
        self.title = title
        self.items = items  # list of (label, value, color_override)
        self.accent = accent
        self.tab_labels = tab_labels
        self.active_tab = active_tab
        self.width = width or 200
        item_h = 36
        header_h = 50
        tabs_h = 36 if tab_labels else 0
        self.height = header_h + tabs_h + len(items) * item_h + 20
        super().__init__()

    def draw(self):
        w, h = self.width, self.height
        d = self.canv
        # phone frame
        d.setFillColor(BG_DARK)
        d.roundRect(0, 0, w, h, 14, fill=1, stroke=0)
        d.setStrokeColor(BG_CARD2)
        d.setLineWidth(1.5)
        d.roundRect(0, 0, w, h, 14, fill=0, stroke=1)

        # header
        d.setFillColor(self.accent)
        d.setFont("Helvetica-Bold", 12)
        d.drawCentredString(w/2, h - 30, self.title)

        y = h - 50
        # tabs
        if self.tab_labels:
            tab_w = w / len(self.tab_labels)
            for i, tab in enumerate(self.tab_labels):
                tx = i * tab_w
                if i == self.active_tab:
                    d.setFillColor(self.accent)
                    d.roundRect(tx + 4, y - tab_w/4, tab_w - 8, 24, 4, fill=1, stroke=0)
                    d.setFillColor(BG_DARK)
                else:
                    d.setFillColor(GRAY_DIM)
                d.setFont("Helvetica-Bold" if i == self.active_tab else "Helvetica", 8)
                d.drawCentredString(tx + tab_w/2, y - 8, tab)
            y -= 36

        # items
        for label, value, col in self.items:
            d.setFillColor(BG_CARD)
            d.roundRect(8, y - 28, w - 16, 30, 5, fill=1, stroke=0)
            d.setFillColor(col or WHITE)
            d.setFont("Helvetica", 8)
            d.drawString(16, y - 14, label)
            if value:
                d.setFillColor(self.accent)
                d.setFont("Helvetica-Bold", 8)
                d.drawRightString(w - 16, y - 14, value)
            y -= 36

    def wrap(self, availW, availH):
        return self.width, self.height


class StepBox(Flowable):
    """Numbered step with description."""
    def __init__(self, number, title, description, width=None, accent=AMBER):
        self.number = str(number)
        self.title = title
        self.description = description
        self.accent = accent
        self.width = width or (PAGE_W - 4*cm)
        self.height = 60
        super().__init__()

    def draw(self):
        w, h = self.width, self.height
        d = self.canv
        d.setFillColor(BG_CARD)
        d.roundRect(0, 0, w, h, 8, fill=1, stroke=0)
        # number circle
        d.setFillColor(self.accent)
        d.circle(28, h/2, 14, fill=1, stroke=0)
        d.setFillColor(BG_DARK)
        d.setFont("Helvetica-Bold", 12)
        d.drawCentredString(28, h/2 - 5, self.number)
        # title
        d.setFillColor(WHITE)
        d.setFont("Helvetica-Bold", 11)
        d.drawString(52, h/2 + 6, self.title)
        # description
        d.setFillColor(GRAY)
        d.setFont("Helvetica", 9)
        d.drawString(52, h/2 - 10, self.description)

    def wrap(self, availW, availH):
        return self.width, self.height


# ── Page template helpers ─────────────────────────────────────────────────────
def add_page_background(c, doc):
    c.saveState()
    c.setFillColor(BG_DARK)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    # subtle corner accent
    c.setFillColor(colors.HexColor("#1c1600"))
    c.circle(PAGE_W, PAGE_H, 120, fill=1, stroke=0)
    c.circle(0, 0, 80, fill=1, stroke=0)
    c.restoreState()


def add_footer(c, doc):
    c.saveState()
    c.setFillColor(GRAY_DIM)
    c.setFont("Helvetica", 8)
    c.drawCentredString(PAGE_W/2, 1.5*cm, f"CasaOS  ·  Guía de Usuario  ·  Página {doc.page}")
    c.setStrokeColor(BG_CARD)
    c.setLineWidth(0.5)
    c.line(2*cm, 2*cm, PAGE_W - 2*cm, 2*cm)
    c.restoreState()


def page_template(c, doc):
    add_page_background(c, doc)
    add_footer(c, doc)


def cover_page_template(c, doc):
    add_page_background(c, doc)
    # big amber circle decoration top-right
    c.saveState()
    c.setFillColor(colors.HexColor("#1a1200"))
    c.circle(PAGE_W - 0.5*cm, PAGE_H - 0.5*cm, 8*cm, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#2a1e00"))
    c.circle(PAGE_W - 0.5*cm, PAGE_H - 0.5*cm, 5*cm, fill=1, stroke=0)
    # bottom-left circle
    c.setFillColor(colors.HexColor("#1a1200"))
    c.circle(0.5*cm, 0.5*cm, 6*cm, fill=1, stroke=0)
    c.restoreState()


# ── Styles ─────────────────────────────────────────────────────────────────────
def make_styles():
    base = getSampleStyleSheet()

    def s(name, parent="Normal", **kw):
        return ParagraphStyle(name, parent=base[parent], **kw)

    return {
        "cover_title": s("cover_title", fontSize=42, fontName="Helvetica-Bold",
                         textColor=AMBER, alignment=TA_CENTER, spaceAfter=8),
        "cover_sub":   s("cover_sub",   fontSize=16, fontName="Helvetica",
                         textColor=WHITE, alignment=TA_CENTER, spaceAfter=4),
        "cover_tagline": s("cover_tagline", fontSize=11, fontName="Helvetica",
                           textColor=GRAY, alignment=TA_CENTER, spaceAfter=30),
        "h1": s("h1", fontSize=22, fontName="Helvetica-Bold",
                textColor=AMBER, spaceBefore=18, spaceAfter=6),
        "h2": s("h2", fontSize=15, fontName="Helvetica-Bold",
                textColor=WHITE, spaceBefore=14, spaceAfter=4),
        "h3": s("h3", fontSize=11, fontName="Helvetica-Bold",
                textColor=AMBER, spaceBefore=10, spaceAfter=3),
        "body": s("body", fontSize=10, fontName="Helvetica",
                  textColor=WHITE, leading=16, spaceAfter=6),
        "body_gray": s("body_gray", fontSize=9, fontName="Helvetica",
                       textColor=GRAY, leading=14, spaceAfter=4),
        "bullet": s("bullet", fontSize=10, fontName="Helvetica",
                    textColor=WHITE, leading=16, leftIndent=14,
                    bulletIndent=0, spaceAfter=2),
        "tip": s("tip", fontSize=9, fontName="Helvetica-Oblique",
                 textColor=AMBER, leading=14, leftIndent=10, spaceAfter=4),
        "toc": s("toc", fontSize=11, fontName="Helvetica",
                 textColor=WHITE, leading=20, spaceAfter=2),
        "toc_num": s("toc_num", fontSize=11, fontName="Helvetica-Bold",
                     textColor=AMBER, leading=20),
        "label": s("label", fontSize=8, fontName="Helvetica-Bold",
                   textColor=AMBER, spaceAfter=2),
    }


# ── Helper to make pill badge ─────────────────────────────────────────────────
def pill_table(labels, accent=AMBER):
    """Return a Table of colored pill badges."""
    cells = []
    for lbl in labels:
        cells.append(
            Paragraph(f"<font color='#{BG_DARK.hexval()[1:]}'>  {lbl}  </font>",
                      ParagraphStyle("pill", fontName="Helvetica-Bold", fontSize=8,
                                     textColor=BG_DARK, backColor=accent,
                                     borderPadding=(2, 6, 2, 6)))
        )
    # pack into a 1-row table
    if not cells:
        return Spacer(1, 1)
    t = Table([cells], colWidths=[None]*len(cells))
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), accent),
        ("TEXTCOLOR",  (0, 0), (-1, -1), BG_DARK),
        ("FONTNAME",   (0, 0), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE",   (0, 0), (-1, -1), 8),
        ("ROWPADDING", (0, 0), (-1, -1), 4),
        ("ROUNDEDCORNERS", [6]),
        ("BOX", (0, 0), (-1, -1), 0, colors.transparent),
        ("INNERGRID", (0, 0), (-1, -1), 0, colors.transparent),
    ]))
    return t


# ── Build PDF ─────────────────────────────────────────────────────────────────
def build():
    output = "/home/user/Casaos/CasaOS_Guia_de_Usuario.pdf"
    doc = SimpleDocTemplate(
        output, pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=2.5*cm, bottomMargin=2.5*cm,
        title="CasaOS – Guía de Usuario",
        author="CasaOS",
    )
    ST = make_styles()
    story = []
    W = PAGE_W - 4*cm  # usable width

    def sp(h=10):
        return Spacer(1, h)

    def hr():
        return HRFlowable(width="100%", thickness=0.5, color=BG_CARD2, spaceAfter=8)

    # ── COVER PAGE ────────────────────────────────────────────────────────────
    story.append(sp(80))
    story.append(Paragraph("🏠 CasaOS", ST["cover_title"]))
    story.append(Paragraph("Guía de Usuario", ST["cover_sub"]))
    story.append(sp(8))
    story.append(Paragraph("Tu hogar digital, siempre en sincronía.", ST["cover_tagline"]))
    story.append(sp(30))

    # feature badges on cover
    badges_data = [
        ("📋", "Tablero"),
        ("📅", "Calendario"),
        ("🍽", "Recetas"),
        ("🛒", "Compras"),
        ("💰", "Finanzas"),
        ("📁", "Proyectos"),
    ]
    badge_cells = []
    for icon, label in badges_data:
        badge_cells.append(
            Paragraph(
                f"<font color='#0f0f0f'><b>  {icon} {label}  </b></font>",
                ParagraphStyle("badge_cover", fontName="Helvetica-Bold", fontSize=10,
                               textColor=BG_DARK, alignment=TA_CENTER)
            )
        )
    badge_t = Table([badge_cells[:3], badge_cells[3:]], colWidths=[W/3]*3)
    badge_t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), AMBER),
        ("TEXTCOLOR",  (0, 0), (-1, -1), BG_DARK),
        ("FONTNAME",   (0, 0), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE",   (0, 0), (-1, -1), 10),
        ("ALIGN",      (0, 0), (-1, -1), "CENTER"),
        ("VALIGN",     (0, 0), (-1, -1), "MIDDLE"),
        ("ROWHEIGHT",  (0, 0), (-1, -1), 28),
        ("ROUNDEDCORNERS", [8]),
        ("INNERGRID",  (0, 0), (-1, -1), 1, BG_DARK),
        ("BOX",        (0, 0), (-1, -1), 0, colors.transparent),
    ]))
    story.append(badge_t)
    story.append(sp(50))

    story.append(Paragraph("Versión 1.0  ·  2025", ST["cover_tagline"]))
    story.append(PageBreak())

    # ── TABLE OF CONTENTS ─────────────────────────────────────────────────────
    story.append(sp(10))
    story.append(Paragraph("Contenido", ST["h1"]))
    story.append(hr())

    toc_items = [
        ("1", "Introducción – ¿Qué es CasaOS?"),
        ("2", "Primeros Pasos – Registro e Inicio de Sesión"),
        ("3", "Navegación Principal"),
        ("4", "Inicio – Tablero y Tareas"),
        ("5", "Agenda – Calendario y Momentos"),
        ("6", "Recetas – Tu Recetario Digital"),
        ("7", "Compras – Lista del Súper"),
        ("8", "Finanzas – Control Económico del Hogar"),
        ("9", "Proyectos – Gestión de Metas"),
        ("10", "Ajustes y Perfil"),
        ("11", "Consejos y Trucos"),
    ]
    for num, title in toc_items:
        row = Table(
            [[Paragraph(num, ST["toc_num"]), Paragraph(title, ST["toc"])]],
            colWidths=[1.2*cm, W - 1.2*cm]
        )
        row.setStyle(TableStyle([
            ("VALIGN",  (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING",  (0, 0), (-1, -1), 2),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ]))
        story.append(row)
    story.append(PageBreak())

    # ── 1 INTRODUCCIÓN ───────────────────────────────────────────────────────
    story.append(SectionHeader("🏠", "CasaOS", "Organiza tu hogar en un solo lugar", AMBER, W))
    story.append(sp(12))
    story.append(Paragraph(
        "CasaOS es la aplicación todo-en-uno diseñada para parejas que quieren mantener su hogar "
        "organizado, sus finanzas bajo control y sus momentos especiales bien documentados. "
        "Con CasaOS, tú y tu pareja siempre estarán en la misma página.",
        ST["body"]
    ))
    story.append(sp(6))
    story.append(FeatureRow(
        "📋", "Tablero centralizado",
        "Ve de un vistazo todo lo importante de tu hogar: notas, tareas y elementos destacados.",
        "🔄", "Sincronización en tiempo real",
        "Los cambios que hace tu pareja aparecen al instante en tu pantalla, sin recargar.",
        W
    ))
    story.append(sp(8))
    story.append(FeatureRow(
        "📱", "Diseño móvil primero",
        "Interfaz optimizada para smartphone con navegación sencilla en la parte inferior.",
        "🔒", "Privacidad por hogar",
        "Tu información es exclusiva de tu hogar. Solo tú y tu pareja tienen acceso.",
        W
    ))
    story.append(sp(12))

    story.append(Paragraph("¿Qué módulos incluye?", ST["h2"]))
    modules = [
        ("🏠 Inicio",     AMBER,  "Tablero con notas rápidas y lista de tareas del hogar"),
        ("📅 Agenda",     BLUE,   "Calendario semanal, eventos y momentos en pareja"),
        ("🍽 Recetas",    GREEN,  "Recetario digital con modo cocina y lista de ingredientes"),
        ("🛒 Compras",    ORANGE, "Lista del súper categorizada y compartida"),
        ("💰 Finanzas",   PURPLE, "Gastos, ingresos, metas de ahorro y balance mensual"),
        ("📁 Proyectos",  PINK,   "Proyectos del hogar con tareas, presupuesto y progreso"),
    ]
    rows = []
    for icon_label, col, desc in modules:
        rows.append([
            Paragraph(f'<font color="#{col.hexval()[2:]}">{icon_label}</font>',
                      ParagraphStyle("mod_title", fontName="Helvetica-Bold", fontSize=10,
                                     textColor=col)),
            Paragraph(desc, ST["body_gray"]),
        ])
    mod_t = Table(rows, colWidths=[3*cm, W - 3*cm])
    mod_t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BG_CARD),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [BG_CARD, BG_CARD2]),
        ("VALIGN",     (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",  (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING",  (0, 0), (0, -1), 10),
        ("LEFTPADDING",  (1, 0), (1, -1), 6),
        ("ROUNDEDCORNERS", [6]),
    ]))
    story.append(mod_t)
    story.append(PageBreak())

    # ── 2 PRIMEROS PASOS ──────────────────────────────────────────────────────
    story.append(SectionHeader("🚀", "Primeros Pasos",
                               "Registro, inicio de sesión e invitación", AMBER, W))
    story.append(sp(12))
    story.append(Paragraph("Opciones de acceso", ST["h2"]))
    story.append(Paragraph(
        "CasaOS usa Supabase Auth para gestionar el acceso de forma segura. Puedes entrar de dos maneras:",
        ST["body"]
    ))
    story.append(sp(8))

    story.append(StepBox(1, "Crear una cuenta nueva",
                         "Registra tu correo y contraseña en la pantalla de inicio. Crea tu hogar y "
                         "elige el nombre que lo representará.", W))
    story.append(sp(6))
    story.append(StepBox(2, "Unirte mediante invitación",
                         "Si tu pareja ya tiene CasaOS, pídele que te envíe un enlace de invitación "
                         "desde Ajustes → Invitar. El enlace caduca después de su uso.", W))
    story.append(sp(6))
    story.append(StepBox(3, "Iniciar sesión",
                         "Si ya tienes cuenta, ingresa tu correo y contraseña. Puedes activar "
                         "'Recordarme' para no volver a ingresar.", W))
    story.append(sp(12))

    story.append(ColoredBox(
        "Invitar a tu pareja",
        [
            "• Ve a Ajustes (ícono de engranaje en el menú superior)",
            "• Toca 'Invitar a alguien a tu hogar'",
            "• Ingresa el correo de tu pareja y envía la invitación",
            "• Tu pareja recibirá un enlace único para unirse al hogar",
            "→ Solo puede existir un hogar por invitación activa a la vez",
        ],
        AMBER, W, "📧"
    ))
    story.append(PageBreak())

    # ── 3 NAVEGACIÓN ──────────────────────────────────────────────────────────
    story.append(SectionHeader("🧭", "Navegación Principal",
                               "Cómo moverte por la app", AMBER, W))
    story.append(sp(12))
    story.append(Paragraph(
        "CasaOS usa una barra de navegación fija en la parte inferior de la pantalla. "
        "Toca cualquier ícono para cambiar de sección al instante.",
        ST["body"]
    ))
    story.append(sp(10))
    story.append(NavBar(W, 0))
    story.append(sp(14))

    nav_rows = [
        ["Ícono", "Nombre", "Descripción"],
        ["⌂",   "Inicio",    "Tablero de notas y lista de tareas del hogar"],
        ["▦",   "Agenda",    "Calendario semanal y momentos en pareja"],
        ["🍽",  "Recetas",   "Recetario con ingredientes e instrucciones"],
        ["🛒",  "Compras",   "Lista de compras organizada por categorías"],
        ["₿",   "Finanzas",  "Gastos, ingresos y metas de ahorro"],
        ["◈",   "Proyectos", "Proyectos del hogar con tareas y presupuesto"],
    ]
    nav_t = Table(nav_rows, colWidths=[1.2*cm, 2.5*cm, W - 3.7*cm])
    nav_t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0), AMBER),
        ("TEXTCOLOR",     (0, 0), (-1, 0), BG_DARK),
        ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, -1), 9),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [BG_CARD, BG_CARD2]),
        ("TEXTCOLOR",     (0, 1), (-1, -1), WHITE),
        ("ALIGN",         (0, 0), (0, -1), "CENTER"),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("ROUNDEDCORNERS", [6]),
    ]))
    story.append(nav_t)
    story.append(sp(12))
    story.append(ColoredBox(
        "Elemento + (Agregar)",
        [
            "• En cada sección hay un botón  +  flotante (esquina inferior derecha)",
            "• Tócalo para crear un nuevo elemento en esa sección",
            "→ El formulario aparece como una ventana emergente desde abajo",
        ],
        AMBER, W, "➕"
    ))
    story.append(PageBreak())

    # ── 4 INICIO ──────────────────────────────────────────────────────────────
    story.append(SectionHeader("📋", "Inicio", "Tablero y Tareas del hogar", AMBER, W))
    story.append(sp(12))
    story.append(Paragraph(
        "La pantalla de inicio es tu centro de control. Tiene dos pestañas: "
        "<b>Tablero</b> para notas y elementos importantes, y <b>Tareas</b> "
        "para las responsabilidades del hogar.",
        ST["body"]
    ))
    story.append(sp(10))

    story.append(Paragraph("Pestaña: Tablero", ST["h2"]))
    story.append(ColoredBox(
        "Sección 'Atención'",
        [
            "• Muestra automáticamente ítems importantes de otras secciones",
            "• Elementos próximos al vencimiento (pagos, eventos) aparecen aquí",
            "→ No puedes agregar ítems directamente aquí; se llenan solos",
        ],
        RED, W, "🔴"
    ))
    story.append(sp(8))
    story.append(ColoredBox(
        "Notas del Hogar",
        [
            "• Toca el botón  +  para agregar una nota rápida",
            "• Escribe el contenido en el campo 'Escribe una nota para el hogar…'",
            "• Toca 'Agregar' para guardarla o 'Cancelar' para descartarla",
            "• Las notas aparecen como tarjetas en el tablero",
            "→ Para eliminar una nota, toca el ícono de papelera en la tarjeta",
        ],
        AMBER, W, "📝"
    ))
    story.append(sp(8))
    story.append(ColoredBox(
        "Ítems Fijados (desde otras secciones)",
        [
            "• Desde Recetas, Compras, Proyectos o Momentos puedes 'Fijar al tablero'",
            "• El ítem aparece en el Tablero con su categoría de origen",
            "• Tipos de ítems: Proyecto, Tarea, Receta, Compras, Momento, Nota",
            "→ Para desfijarlo, toca el ícono de pin nuevamente en la sección original",
        ],
        BLUE, W, "📌"
    ))
    story.append(sp(12))

    story.append(Paragraph("Pestaña: Tareas", ST["h2"]))
    story.append(Paragraph(
        "Gestiona las responsabilidades del hogar con tareas recurrentes o únicas.",
        ST["body"]
    ))
    story.append(sp(8))

    tasks_table = Table([
        [Paragraph("Opción", ST["label"]), Paragraph("Descripción", ST["label"])],
        [Paragraph("Diaria", ST["body"]),       Paragraph("Se resetea todos los días", ST["body_gray"])],
        [Paragraph("Semanal", ST["body"]),      Paragraph("Se resetea cada semana", ST["body_gray"])],
        [Paragraph("Quincenal", ST["body"]),    Paragraph("Se resetea cada 2 semanas", ST["body_gray"])],
        [Paragraph("Mensual", ST["body"]),      Paragraph("Se resetea el mismo día cada mes", ST["body_gray"])],
        [Paragraph("Única vez", ST["body"]),    Paragraph("Tarea de una sola vez", ST["body_gray"])],
    ], colWidths=[3.5*cm, W - 3.5*cm])
    tasks_table.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0), AMBER),
        ("TEXTCOLOR",     (0, 0), (-1, 0), BG_DARK),
        ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [BG_CARD, BG_CARD2]),
        ("TEXTCOLOR",     (0, 1), (-1, -1), WHITE),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("ROUNDEDCORNERS", [6]),
    ]))
    story.append(tasks_table)
    story.append(sp(8))
    story.append(ColoredBox(
        "Crear una tarea",
        [
            "• Toca  +  → escribe el nombre en 'Nombre de la tarea…'",
            "• Elige la frecuencia: Diaria / Semanal / Quincenal / Mensual / Única vez",
            "• Asigna la tarea: 'Yo' o el nombre de tu pareja",
            "• Toca 'Agregar' para guardar",
            "→ Las tareas completadas pasan a la sección 'Completadas hoy'",
        ],
        AMBER, W, "✅"
    ))
    story.append(PageBreak())

    # ── 5 AGENDA ─────────────────────────────────────────────────────────────
    story.append(SectionHeader("📅", "Agenda", "Calendario y Momentos en pareja", BLUE, W))
    story.append(sp(12))
    story.append(Paragraph(
        "La Agenda combina un calendario semanal para eventos del hogar y "
        "una sección especial de <b>Momentos</b> para actividades en pareja.",
        ST["body"]
    ))
    story.append(sp(10))

    story.append(Paragraph("Calendario Semanal", ST["h2"]))
    story.append(ColoredBox(
        "Vista de la semana",
        [
            "• Navega entre semanas con las flechas  ←  y  →",
            "• Los días L M X J V S D se muestran en la fila superior",
            "• Toca un día para ver sus eventos en el listado inferior",
            "• El día de hoy aparece resaltado con ámbar",
            "→ Los eventos de toda la semana se muestran debajo del calendario",
        ],
        BLUE, W, "📅"
    ))
    story.append(sp(8))
    story.append(ColoredBox(
        "Agregar un evento",
        [
            "• Toca el botón  +  (esquina inferior derecha)",
            "• Escribe el nombre del evento",
            "• Marca 'Todo el día' si no tiene hora específica",
            "• Si tiene hora, aparecerán campos de hora inicio y fin",
            "• Elige la etiqueta: Médico / Social / Pagos / Mantenimiento / Momento",
            "• Agrega un link opcional (Google Meet, reservación, etc.)",
            "• Toca 'Agregar' para guardar",
        ],
        BLUE, W, "➕"
    ))
    story.append(sp(8))

    event_tags = Table([
        [
            Paragraph('<font color="#0f0f0f"><b>  Médico  </b></font>',
                      ParagraphStyle("t", fontName="Helvetica-Bold", fontSize=8, textColor=BG_DARK)),
            Paragraph('<font color="#0f0f0f"><b>  Social  </b></font>',
                      ParagraphStyle("t", fontName="Helvetica-Bold", fontSize=8, textColor=BG_DARK)),
            Paragraph('<font color="#0f0f0f"><b>  Pagos  </b></font>',
                      ParagraphStyle("t", fontName="Helvetica-Bold", fontSize=8, textColor=BG_DARK)),
            Paragraph('<font color="#0f0f0f"><b>  Mantenimiento  </b></font>',
                      ParagraphStyle("t", fontName="Helvetica-Bold", fontSize=8, textColor=BG_DARK)),
            Paragraph('<font color="#0f0f0f"><b>  Momento  </b></font>',
                      ParagraphStyle("t", fontName="Helvetica-Bold", fontSize=8, textColor=BG_DARK)),
        ]
    ], colWidths=[W/5]*5)
    event_tags.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (0, -1), BLUE),
        ("BACKGROUND",  (1, 0), (1, -1), GREEN),
        ("BACKGROUND",  (2, 0), (2, -1), RED),
        ("BACKGROUND",  (3, 0), (3, -1), ORANGE),
        ("BACKGROUND",  (4, 0), (4, -1), PURPLE),
        ("ALIGN",  (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("ROUNDEDCORNERS", [8]),
        ("INNERGRID", (0, 0), (-1, -1), 3, BG_DARK),
    ]))
    story.append(Paragraph("Etiquetas de eventos:", ST["h3"]))
    story.append(event_tags)
    story.append(sp(12))

    story.append(Paragraph("Momentos en Pareja", ST["h2"]))
    story.append(Paragraph(
        "La sección de Momentos te ayuda a planear y recordar actividades especiales "
        "en pareja. Puedes agregar ideas, links e incluso pedir una sugerencia aleatoria.",
        ST["body"]
    ))
    story.append(sp(8))
    story.append(ColoredBox(
        "Agregar un momento",
        [
            "• En la sección 'Momentos', toca el botón  +",
            "• Escribe la actividad en '¿Qué quieren hacer?'",
            "• Elige una categoría: Cita / Viaje / Experiencia / En casa / Cultura / Gastro / Aventura",
            "• Agrega un link opcional (TikTok, Instagram, web...)",
            "• Agrega un link de Google Maps si tiene ubicación",
            "• Toca 'Agregar' para guardar",
        ],
        PURPLE, W, "💑"
    ))
    story.append(sp(8))
    story.append(ColoredBox(
        "Sugerencia aleatoria",
        [
            "• Toca el ícono de dados (🎲) para obtener una sugerencia aleatoria",
            "• CasaOS elegirá uno de tus momentos guardados al azar",
            "• Puedes fijar momentos al tablero con 'Agregar al tablero'",
        ],
        PURPLE, W, "🎲"
    ))
    story.append(PageBreak())

    # ── 6 RECETAS ─────────────────────────────────────────────────────────────
    story.append(SectionHeader("🍽", "Recetas", "Tu recetario digital", GREEN, W))
    story.append(sp(12))
    story.append(Paragraph(
        "Guarda todas tus recetas favoritas con ingredientes e instrucciones. "
        "El modo cocina te guía paso a paso mientras preparas el platillo.",
        ST["body"]
    ))
    story.append(sp(10))

    story.append(Paragraph("Categorías de recetas", ST["h2"]))
    cat_rows = [[
        Paragraph('<font color="#0f0f0f"><b>  Todas  </b></font>',
                  ParagraphStyle("c", fontName="Helvetica-Bold", fontSize=9, textColor=BG_DARK)),
        Paragraph('<font color="#0f0f0f"><b>  Desayuno  </b></font>',
                  ParagraphStyle("c", fontName="Helvetica-Bold", fontSize=9, textColor=BG_DARK)),
        Paragraph('<font color="#0f0f0f"><b>  Comida  </b></font>',
                  ParagraphStyle("c", fontName="Helvetica-Bold", fontSize=9, textColor=BG_DARK)),
        Paragraph('<font color="#0f0f0f"><b>  Cena  </b></font>',
                  ParagraphStyle("c", fontName="Helvetica-Bold", fontSize=9, textColor=BG_DARK)),
        Paragraph('<font color="#0f0f0f"><b>  Snack  </b></font>',
                  ParagraphStyle("c", fontName="Helvetica-Bold", fontSize=9, textColor=BG_DARK)),
        Paragraph('<font color="#0f0f0f"><b>  Otro  </b></font>',
                  ParagraphStyle("c", fontName="Helvetica-Bold", fontSize=9, textColor=BG_DARK)),
    ]]
    cat_t = Table(cat_rows, colWidths=[W/6]*6)
    cat_t.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (0, -1), GRAY_DIM),
        ("BACKGROUND",  (1, 0), (1, -1), ORANGE),
        ("BACKGROUND",  (2, 0), (2, -1), GREEN),
        ("BACKGROUND",  (3, 0), (3, -1), BLUE),
        ("BACKGROUND",  (4, 0), (4, -1), PURPLE),
        ("BACKGROUND",  (5, 0), (5, -1), GRAY),
        ("ALIGN",  (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("ROUNDEDCORNERS", [8]),
        ("INNERGRID", (0, 0), (-1, -1), 3, BG_DARK),
    ]))
    story.append(cat_t)
    story.append(sp(12))

    story.append(Paragraph("Agregar una receta", ST["h2"]))
    story.append(ColoredBox(
        "Crear nueva receta",
        [
            "• Toca el botón  +  para abrir 'Nueva receta'",
            "• Escribe el nombre de la receta",
            "• Selecciona la categoría (Desayuno / Comida / Cena / Snack / Otro)",
            "• En 'Ingredientes — uno por línea', escribe cada ingrediente en su propio renglón",
            "• En 'Descripción / Instrucciones (opcional)' agrega los pasos",
            "• Toca 'Guardar' cuando termines",
        ],
        GREEN, W, "📝"
    ))
    story.append(sp(8))

    story.append(Paragraph("Usar una receta", ST["h2"]))
    story.append(ColoredBox(
        "Modo Cocina",
        [
            "• Toca una tarjeta de receta para ver sus detalles",
            "• Toca 'Modo cocina' para activar el modo guiado",
            "• Ve marcando ingredientes uno a uno: verás '{X}/{Y} listos'",
            "• Lee las instrucciones en la sección inferior",
            "• Toca 'Cocinando…' o sal del modal para terminar",
        ],
        GREEN, W, "👨‍🍳"
    ))
    story.append(sp(8))
    story.append(ColoredBox(
        "Enviar ingredientes a Compras",
        [
            "• Abre la receta y toca el botón 'A compras'",
            "• Todos los ingredientes de la receta se agregan a tu Lista de Compras",
            "• Aparecerán en la categoría 'Abarrotes' por defecto",
            "→ Puedes cambiar la categoría de cada ingrediente desde Compras",
        ],
        ORANGE, W, "🛒"
    ))
    story.append(PageBreak())

    # ── 7 COMPRAS ─────────────────────────────────────────────────────────────
    story.append(SectionHeader("🛒", "Compras", "Lista del súper compartida", ORANGE, W))
    story.append(sp(12))
    story.append(Paragraph(
        "La lista de compras es compartida entre tú y tu pareja. Organiza los artículos "
        "por categorías para facilitar el recorrido en el supermercado.",
        ST["body"]
    ))
    story.append(sp(10))

    story.append(Paragraph("Categorías disponibles", ST["h2"]))
    cat_data = [
        ("🥦 Frutas y Verduras", "🥛 Lácteos", "🥩 Carnes"),
        ("🍞 Panadería",         "🥤 Bebidas", "🧹 Limpieza"),
        ("🪥 Higiene",           "🥫 Abarrotes","📦 Otros"),
    ]
    for row in cat_data:
        r = []
        for cell in row:
            r.append(Paragraph(cell, ParagraphStyle("cc", fontName="Helvetica", fontSize=9,
                                                     textColor=WHITE, alignment=TA_CENTER)))
        story.append(Table([r], colWidths=[W/3]*3))
        t2 = story[-1]
        t2.setStyle(TableStyle([
            ("BACKGROUND",  (0, 0), (-1, -1), BG_CARD),
            ("ALIGN",  (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING",    (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("INNERGRID", (0, 0), (-1, -1), 2, BG_DARK),
            ("BOX",       (0, 0), (-1, -1), 0, colors.transparent),
        ]))
        story.append(sp(3))

    story.append(sp(10))
    story.append(Paragraph("Cómo usar la lista", ST["h2"]))
    story.append(ColoredBox(
        "Agregar un artículo",
        [
            "• Toca  +  → escribe qué necesitas en '¿Qué necesitas comprar?'",
            "• Selecciona la categoría con los botones de abajo",
            "• Toca 'Agregar' para guardarlo en la lista",
        ],
        ORANGE, W, "➕"
    ))
    story.append(sp(6))
    story.append(ColoredBox(
        "Marcar como comprado",
        [
            "• Toca el círculo a la izquierda del artículo para tacharlo",
            "• El artículo se mueve visualmente al final de su categoría",
            "• Para desmarcar, vuelve a tocar el círculo",
        ],
        GREEN, W, "✅"
    ))
    story.append(sp(6))
    story.append(ColoredBox(
        "Limpiar artículos comprados",
        [
            "• Cuando hay artículos marcados, aparece el botón 'Limpiar (X)' arriba",
            "• Tócalo para eliminar todos los artículos ya comprados de una sola vez",
            "→ Esta acción no se puede deshacer",
        ],
        RED, W, "🗑"
    ))
    story.append(PageBreak())

    # ── 8 FINANZAS ────────────────────────────────────────────────────────────
    story.append(SectionHeader("💰", "Finanzas", "Control económico del hogar", PURPLE, W))
    story.append(sp(12))
    story.append(Paragraph(
        "El módulo de Finanzas te permite controlar tanto los gastos del hogar "
        "como tus finanzas personales. Tiene tres pestañas: <b>Hogar</b>, <b>Personal</b> "
        "y <b>Resumen</b>.",
        ST["body"]
    ))
    story.append(sp(10))

    story.append(Paragraph("Pestaña: Hogar", ST["h2"]))
    story.append(ColoredBox(
        "Compromisos del hogar",
        [
            "• Son los gastos recurrentes mensuales: renta, servicios, Netflix, etc.",
            "• Muestra quién paga cada gasto (tú, tu pareja o sin asignar)",
            "• Los gastos con fecha próxima aparecen en 'Por pagar'",
            "• Los ya pagados este mes aparecen en 'Pagado'",
        ],
        PURPLE, W, "🏠"
    ))
    story.append(sp(6))
    story.append(ColoredBox(
        "Agregar gasto fijo",
        [
            "• Toca  +  → elige 'Gasto fijo del hogar'",
            "• Escribe el título (ej. 'Netflix', 'Renta', 'Internet')",
            "• Ingresa el monto mensual",
            "• Selecciona el día del mes en que se paga",
            "• Asigna quién paga: tu nombre, el de tu pareja o 'Sin asignar'",
            "• Toca 'Agregar'",
        ],
        PURPLE, W, "➕"
    ))
    story.append(sp(6))
    story.append(ColoredBox(
        "Metas de ahorro",
        [
            "• Crea metas con nombre, monto objetivo y fecha límite opcional",
            "• Toca 'Abonar' para registrar depósitos hacia la meta",
            "• Una barra de progreso muestra cuánto llevan ahorrado",
            "→ Las metas pueden vincularse a un Proyecto desde la sección Proyectos",
        ],
        GREEN, W, "🎯"
    ))
    story.append(sp(10))

    story.append(Paragraph("Pestaña: Personal", ST["h2"]))
    story.append(ColoredBox(
        "Balance personal del mes",
        [
            "• Muestra tus ingresos, gastos y balance neto del mes actual",
            "• Navega entre meses con las flechas  ←  →  en la cabecera",
            "• Sección 'Cuentas divididas': gastos compartidos con tu pareja",
            "• Si tu pareja te debe, verás '{Pareja} te debe: $XXX'",
            "• Si le debes, verás 'Le debes a {Pareja}: $XXX'",
            "→ Toca 'Saldar' cuando liquiden la deuda",
        ],
        BLUE, W, "👤"
    ))
    story.append(sp(6))
    story.append(ColoredBox(
        "Agregar un movimiento",
        [
            "• Toca  +  → 'Nuevo movimiento'",
            "• Elige tipo: Gasto o Ingreso",
            "• Elige alcance: Hogar o Personal",
            "• Escribe el título y el monto",
            "• Selecciona categoría: Comida / Casa / Servicios / Entretenimiento /",
            "  Salud / Transporte / Ropa / Otros",
            "• Marca si está Pendiente o Pagado",
            "• Opción: 'Dividir con {Pareja}' para dividir el gasto a la mitad",
        ],
        BLUE, W, "💸"
    ))
    story.append(sp(10))

    story.append(Paragraph("Pestaña: Resumen", ST["h2"]))
    story.append(ColoredBox(
        "Análisis financiero",
        [
            "• Gráfica de tendencia de los últimos 6 meses",
            "• Desglose de gastos personales por categoría del mes actual",
            "• Lista de todos los compromisos mensuales del hogar",
            "• Cuentas pendientes entre tú y tu pareja",
        ],
        AMBER, W, "📊"
    ))
    story.append(PageBreak())

    # ── 9 PROYECTOS ───────────────────────────────────────────────────────────
    story.append(SectionHeader("📁", "Proyectos", "Gestión de metas del hogar", PINK, W))
    story.append(sp(12))
    story.append(Paragraph(
        "Los Proyectos te permiten organizar iniciativas grandes del hogar: "
        "remodelaciones, viajes, compras importantes, etc. Cada proyecto tiene "
        "tareas, presupuesto y puede vincularse a una meta de ahorro.",
        ST["body"]
    ))
    story.append(sp(10))

    story.append(Paragraph("Estados de un proyecto", ST["h2"]))
    status_rows = [[
        Paragraph('<font color="#0f0f0f"><b>  Planeando  </b></font>',
                  ParagraphStyle("s1", fontName="Helvetica-Bold", fontSize=10, textColor=BG_DARK)),
        Paragraph('<font color="#0f0f0f"><b>  En progreso  </b></font>',
                  ParagraphStyle("s2", fontName="Helvetica-Bold", fontSize=10, textColor=BG_DARK)),
        Paragraph('<font color="#0f0f0f"><b>  Terminado  </b></font>',
                  ParagraphStyle("s3", fontName="Helvetica-Bold", fontSize=10, textColor=BG_DARK)),
    ]]
    status_t = Table(status_rows, colWidths=[W/3]*3)
    status_t.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (0, -1), AMBER),
        ("BACKGROUND",  (1, 0), (1, -1), BLUE),
        ("BACKGROUND",  (2, 0), (2, -1), GREEN),
        ("ALIGN",  (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("ROUNDEDCORNERS", [8]),
        ("INNERGRID", (0, 0), (-1, -1), 3, BG_DARK),
    ]))
    story.append(status_t)
    story.append(sp(12))

    story.append(ColoredBox(
        "Crear un proyecto",
        [
            "• Toca  +  → escribe el nombre del proyecto",
            "• Selecciona el estado inicial (generalmente 'Planeando')",
            "• Agrega una descripción opcional (objetivos, notas, contexto)",
            "• Agrega un presupuesto total opcional",
            "• Toca 'Guardar'",
        ],
        PINK, W, "📝"
    ))
    story.append(sp(8))
    story.append(ColoredBox(
        "Gestionar tareas del proyecto",
        [
            "• Toca un proyecto para ver su detalle",
            "• En la sección 'Tareas', escribe el nombre de cada tarea",
            "• Agrega un costo opcional a cada tarea ($)",
            "• Toca 'Agregar tarea' para guardarla",
            "• Marca las tareas completadas con el checkbox",
            "• El progreso se muestra como '{X}/{Y} tareas' en la tarjeta",
        ],
        PINK, W, "✅"
    ))
    story.append(sp(8))
    story.append(ColoredBox(
        "Presupuesto y meta de ahorro",
        [
            "• El presupuesto consumido se calcula sumando el costo de todas las tareas",
            "• En 'Meta de ahorro', vincula el proyecto a una meta de Finanzas",
            "• Así puedes ver el progreso de ahorro directamente en el proyecto",
            "→ Fija proyectos al tablero con 'Agregar al tablero'",
        ],
        GREEN, W, "💰"
    ))
    story.append(PageBreak())

    # ── 10 AJUSTES ────────────────────────────────────────────────────────────
    story.append(SectionHeader("⚙️", "Ajustes y Perfil",
                               "Configura tu cuenta y hogar", GRAY, W))
    story.append(sp(12))
    story.append(Paragraph(
        "Accede a los Ajustes desde el ícono de engranaje en la parte superior de la pantalla.",
        ST["body"]
    ))
    story.append(sp(10))

    story.append(ColoredBox(
        "Opciones en Ajustes",
        [
            "• Ver y editar tu nombre de perfil",
            "• Ver el nombre de tu hogar y editarlo",
            "• Ver los miembros de tu hogar (tú y tu pareja)",
            "• Invitar a alguien al hogar (genera un token único por correo)",
            "• Cerrar sesión de forma segura",
        ],
        GRAY, W, "⚙️"
    ))
    story.append(sp(8))
    story.append(ColoredBox(
        "Gestión del hogar",
        [
            "• El 'Hogar' es la unidad central: todos los datos pertenecen al hogar",
            "• Solo puede haber 2 miembros por hogar (una pareja)",
            "• El nombre del hogar aparece como título en la pantalla de Inicio",
            "→ Si quieres cambiar de hogar, contacta al soporte de CasaOS",
        ],
        AMBER, W, "🏠"
    ))
    story.append(PageBreak())

    # ── 11 TIPS ───────────────────────────────────────────────────────────────
    story.append(SectionHeader("💡", "Consejos y Trucos",
                               "Saca el máximo provecho de CasaOS", AMBER, W))
    story.append(sp(12))

    tips = [
        ("Usa el Tablero como panel de control",
         "Fija las cosas más importantes de cada sección al tablero para tenerlas "
         "siempre visibles: la receta de la semana, el proyecto activo, la lista de compras."),
        ("Activa los gastos divididos",
         "Cuando compartas un gasto con tu pareja (cena, viaje, etc.) usa 'Dividir con {Pareja}' "
         "para que CasaOS lleve el registro de quién le debe a quién automáticamente."),
        ("Sincroniza recetas con compras",
         "Antes de ir al súper, abre la receta que vas a cocinar y toca 'A compras'. "
         "Todos los ingredientes se agregan solos a tu lista de compras."),
        ("Usa etiquetas en el calendario",
         "Las etiquetas de eventos (Médico, Social, Pagos...) te ayudan a filtrar "
         "visualmente qué tipo de compromisos tienes en la semana."),
        ("La sección 'Atención' es tu alarma",
         "Revisa diariamente la sección 'Atención' en el Tablero. Ahí aparecen los pagos "
         "próximos, tareas atrasadas y eventos importantes del día."),
        ("Proyectos + Metas de ahorro",
         "Vincula cada proyecto con una meta de ahorro para ver en un solo lugar "
         "cuánto has ahorrado y cuánto necesitas para completar el proyecto."),
    ]
    for i, (title, desc) in enumerate(tips, 1):
        story.append(KeepTogether([
            StepBox(i, title, desc, W),
            sp(6),
        ]))
    story.append(sp(12))

    story.append(ColoredBox(
        "¿Tienes problemas o sugerencias?",
        [
            "• CasaOS está en constante mejora basándose en el feedback de los usuarios",
            "• Si encuentras algún error, captura la pantalla y compártela con el desarrollador",
            "• ¿Tienes una idea de función nueva? ¡Cuéntanosla!",
            "→ Escríbenos a través del canal de soporte de tu hogar",
        ],
        AMBER, W, "❓"
    ))
    story.append(sp(20))

    # final message
    story.append(Paragraph("¡Bienvenidos a CasaOS! 🏠", ST["h1"]))
    story.append(Paragraph(
        "Esperamos que esta guía te ayude a sacar el máximo provecho de la aplicación. "
        "Recuerda que CasaOS está diseñado para que tú y tu pareja estén siempre en sincronía.",
        ST["body"]
    ))

    # ── BUILD ─────────────────────────────────────────────────────────────────
    doc.build(story, onFirstPage=cover_page_template, onLaterPages=page_template)
    print(f"PDF generado: {output}")
    return output


if __name__ == "__main__":
    build()
