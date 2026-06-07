#!/usr/bin/env python3
"""Generate CasaOS user guide PDF — clean Table-based layout."""

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether, PageBreak,
)
from reportlab.platypus.flowables import Flowable

PAGE_W, PAGE_H = A4

# ── Palette ──────────────────────────────────────────────────────────────────
BG      = colors.HexColor("#0f0f0f")
CARD    = colors.HexColor("#1a1a1a")
CARD2   = colors.HexColor("#242424")
AMBER   = colors.HexColor("#fbbf24")
WHITE   = colors.HexColor("#ffffff")
GRAY    = colors.HexColor("#9ca3af")
GRAY2   = colors.HexColor("#6b7280")
GREEN   = colors.HexColor("#4ade80")
BLUE    = colors.HexColor("#60a5fa")
PURPLE  = colors.HexColor("#a78bfa")
RED     = colors.HexColor("#f87171")
ORANGE  = colors.HexColor("#fb923c")
PINK    = colors.HexColor("#f472b6")

USABLE  = PAGE_W - 4 * cm   # usable page width


# ── Styles ───────────────────────────────────────────────────────────────────
def S(name, **kw):
    defaults = dict(fontName="Helvetica", fontSize=10, textColor=WHITE,
                    leading=15, spaceAfter=0, spaceBefore=0)
    defaults.update(kw)
    return ParagraphStyle(name, **defaults)

H1      = S("H1",  fontName="Helvetica-Bold", fontSize=22, textColor=AMBER,
            spaceBefore=18, spaceAfter=8)
H2      = S("H2",  fontName="Helvetica-Bold", fontSize=14, textColor=WHITE,
            spaceBefore=12, spaceAfter=6)
H3      = S("H3",  fontName="Helvetica-Bold", fontSize=11, textColor=AMBER,
            spaceBefore=8,  spaceAfter=4)
BODY    = S("BODY", leading=16, spaceAfter=6)
BODYG   = S("BODYG", textColor=GRAY, fontSize=9, leading=14, spaceAfter=3)
COVER_T = S("CT",  fontName="Helvetica-Bold", fontSize=40, textColor=AMBER,
            alignment=TA_CENTER, leading=46)
COVER_S = S("CS",  fontName="Helvetica-Bold", fontSize=16, textColor=WHITE,
            alignment=TA_CENTER, leading=22)
COVER_G = S("CG",  textColor=GRAY, fontSize=11, alignment=TA_CENTER, leading=16)
TOC_N   = S("TN",  fontName="Helvetica-Bold", fontSize=11, textColor=AMBER, leading=22)
TOC_T   = S("TT",  fontSize=11, textColor=WHITE, leading=22)
# Cell styles
BOX_TTL = S("BT",  fontName="Helvetica-Bold", fontSize=10, textColor=WHITE,
            leading=14, spaceAfter=4)
BOX_BUL = S("BB",  fontSize=9, textColor=GRAY,  leading=14, spaceAfter=1)
BOX_ARW = S("BA",  fontSize=9, textColor=AMBER, leading=14, spaceAfter=1,
            leftIndent=0)
TH      = S("TH",  fontName="Helvetica-Bold", fontSize=9, textColor=BG,
            alignment=TA_CENTER)
TD      = S("TD",  fontSize=9, textColor=WHITE, leading=14)
TDG     = S("TDG", fontSize=9, textColor=GRAY,  leading=14)
STEP_N  = S("SN",  fontName="Helvetica-Bold", fontSize=14, textColor=BG,
            alignment=TA_CENTER, leading=18)
STEP_T  = S("ST",  fontName="Helvetica-Bold", fontSize=10, textColor=WHITE,
            leading=14, spaceAfter=2)
STEP_D  = S("SD",  fontSize=9,  textColor=GRAY,  leading=13)
NAV_IC  = S("NI",  fontName="Helvetica-Bold", fontSize=16, textColor=AMBER,
            alignment=TA_CENTER, leading=20)
NAV_LB  = S("NL",  fontSize=8,  textColor=GRAY2, alignment=TA_CENTER, leading=11)
PILL    = S("PL",  fontName="Helvetica-Bold", fontSize=9, textColor=BG,
            alignment=TA_CENTER, leading=14)
BADGE   = S("BA2", fontName="Helvetica-Bold", fontSize=10, textColor=BG,
            alignment=TA_CENTER, leading=16)
SHDR_T  = S("SHT", fontName="Helvetica-Bold", fontSize=15, textColor=WHITE,
            leading=18)
SHDR_S  = S("SHS", fontSize=10, textColor=GRAY, leading=14)


def sp(n=8):
    return Spacer(1, n)


def hr():
    return HRFlowable(width="100%", thickness=0.5, color=CARD2, spaceAfter=8,
                      spaceBefore=4)


# ── Reusable Table-based components ──────────────────────────────────────────

def info_box(title, bullets, accent=AMBER, icon=""):
    """
    Colored info box: thin accent bar on left, title + bullets on right.
    All text goes through Paragraph so wrapping is automatic.
    """
    label_txt = f"{icon}  {title}" if icon else title
    content = [Paragraph(f"<b>{label_txt}</b>", BOX_TTL)]
    for b in bullets:
        if b.startswith("→"):
            content.append(Paragraph(b, BOX_ARW))
        elif b.startswith("•"):
            content.append(Paragraph(b, BOX_BUL))
        else:
            content.append(Paragraph(b, BOX_BUL))

    t = Table(
        [["", content]],
        colWidths=[7, USABLE - 7],
    )
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (0, -1), accent),
        ("BACKGROUND",    (1, 0), (1, -1), CARD),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING",    (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LEFTPADDING",   (1, 0), (1, -1), 12),
        ("RIGHTPADDING",  (1, 0), (1, -1), 12),
        ("LEFTPADDING",   (0, 0), (0, -1), 0),
        ("RIGHTPADDING",  (0, 0), (0, -1), 0),
    ]))
    return t


def step_box(number, title, desc):
    """Numbered step: circle with number | title + description."""
    t = Table(
        [[Paragraph(str(number), STEP_N),
          [Paragraph(title, STEP_T), Paragraph(desc, STEP_D)]]],
        colWidths=[36, USABLE - 36],
    )
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (0, -1), AMBER),
        ("BACKGROUND",    (1, 0), (1, -1), CARD),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LEFTPADDING",   (1, 0), (1, -1), 12),
        ("RIGHTPADDING",  (1, 0), (1, -1), 12),
    ]))
    return t


def section_header(icon, title, subtitle, accent=AMBER):
    """Section header: icon circle | title + subtitle."""
    t = Table(
        [[Paragraph(icon, S("ic", fontName="Helvetica-Bold", fontSize=18,
                             textColor=BG, alignment=TA_CENTER, leading=22)),
          [Paragraph(title, SHDR_T), Paragraph(subtitle, SHDR_S)]]],
        colWidths=[44, USABLE - 44],
    )
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (0, -1), accent),
        ("BACKGROUND",    (1, 0), (1, -1), CARD),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
        ("LEFTPADDING",   (1, 0), (1, -1), 14),
        ("RIGHTPADDING",  (1, 0), (1, -1), 12),
        ("LEFTPADDING",   (0, 0), (0, -1), 4),
        ("RIGHTPADDING",  (0, 0), (0, -1), 4),
    ]))
    return t


def feature_row(icon_l, title_l, desc_l, icon_r, title_r, desc_r):
    """Two-column feature highlight."""
    CW = (USABLE - 8) / 2

    def cell(icon, title, desc):
        return [
            Paragraph(icon,  S("fi", fontName="Helvetica-Bold", fontSize=20,
                                textColor=AMBER, leading=24)),
            Paragraph(title, S("ft", fontName="Helvetica-Bold", fontSize=10,
                                textColor=WHITE, leading=14, spaceBefore=4)),
            Paragraph(desc,  S("fd", fontSize=9, textColor=GRAY, leading=13)),
        ]

    t = Table(
        [[cell(icon_l, title_l, desc_l), cell(icon_r, title_r, desc_r)]],
        colWidths=[CW, CW],
    )
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), CARD),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING",    (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
        ("LEFTPADDING",   (0, 0), (-1, -1), 12),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 12),
        ("INNERGRID",     (0, 0), (-1, -1), 6, BG),
        ("LINEAFTER",     (0, 0), (0, -1), 6, BG),
    ]))
    return t


def nav_bar():
    """Bottom navigation bar mock-up using a Table."""
    items = [
        ("⌂", "Inicio"),
        ("▦", "Agenda"),
        ("✦", "Recetas"),
        ("◉", "Compras"),
        ("$", "Finanzas"),
        ("◈", "Proyectos"),
    ]
    CW = USABLE / len(items)
    icons = [Paragraph(ic, NAV_IC) for ic, _ in items]
    labels = [Paragraph(lb, NAV_LB) for _, lb in items]

    t = Table(
        [icons, labels],
        colWidths=[CW] * len(items),
        rowHeights=[28, 16],
    )
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), CARD),
        ("BACKGROUND",    (0, 0), (0, 1),   AMBER),   # first item active
        ("TEXTCOLOR",     (0, 0), (0, 1),   BG),
        ("ALIGN",         (0, 0), (-1, -1), "CENTER"),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("INNERGRID",     (0, 0), (-1, -1), 1, BG),
        ("BOX",           (0, 0), (-1, -1), 0, colors.transparent),
    ]))
    return t


def data_table(headers, rows, col_widths=None):
    """Standard dark-themed data table."""
    if col_widths is None:
        col_widths = [USABLE / len(headers)] * len(headers)
    header_row = [Paragraph(h, TH) for h in headers]
    body_rows  = [[Paragraph(str(c), TD if i == 0 else TDG)
                   for i, c in enumerate(row)]
                  for row in rows]
    t = Table([header_row] + body_rows, colWidths=col_widths)
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0),  AMBER),
        ("TEXTCOLOR",     (0, 0), (-1, 0),  BG),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [CARD, CARD2]),
        ("TEXTCOLOR",     (0, 1), (-1, -1), WHITE),
        ("ALIGN",         (0, 0), (-1, -1), "LEFT"),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING",   (0, 0), (-1, -1), 10),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 10),
        ("INNERGRID",     (0, 0), (-1, -1), 0.5, BG),
        ("BOX",           (0, 0), (-1, -1), 0, colors.transparent),
    ]))
    return t


def color_pills(labels_colors):
    """Row of colored pill badges: [(label, bg_color), ...]"""
    cw = USABLE / len(labels_colors)
    cells = [Paragraph(lbl, PILL) for lbl, _ in labels_colors]
    t = Table([cells], colWidths=[cw] * len(labels_colors))
    style = [
        ("ALIGN",         (0, 0), (-1, -1), "CENTER"),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("INNERGRID",     (0, 0), (-1, -1), 3, BG),
        ("BOX",           (0, 0), (-1, -1), 0, colors.transparent),
    ]
    for i, (_, bg) in enumerate(labels_colors):
        style.append(("BACKGROUND", (i, 0), (i, 0), bg))
        style.append(("TEXTCOLOR",  (i, 0), (i, 0), BG))
    t.setStyle(TableStyle(style))
    return t


# ── Page templates ───────────────────────────────────────────────────────────
def bg_page(c, doc):
    c.saveState()
    c.setFillColor(BG)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    # subtle corner glow
    c.setFillColor(colors.HexColor("#1c1600"))
    c.circle(PAGE_W, PAGE_H, 100, fill=1, stroke=0)
    c.circle(0, 0, 70, fill=1, stroke=0)
    # footer
    c.setFillColor(GRAY2)
    c.setFont("Helvetica", 8)
    c.drawCentredString(PAGE_W / 2, 1.4 * cm, f"CasaOS  ·  Guía de Usuario  ·  Página {doc.page}")
    c.setStrokeColor(CARD2)
    c.setLineWidth(0.5)
    c.line(2 * cm, 2 * cm, PAGE_W - 2 * cm, 2 * cm)
    c.restoreState()


def cover_page(c, doc):
    c.saveState()
    c.setFillColor(BG)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    # decorative circles
    c.setFillColor(colors.HexColor("#1a1200"))
    c.circle(PAGE_W, PAGE_H, 160, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#221800"))
    c.circle(PAGE_W, PAGE_H, 100, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#1a1200"))
    c.circle(0, 0, 110, fill=1, stroke=0)
    c.restoreState()


# ── Build ─────────────────────────────────────────────────────────────────────
def build():
    out = "/home/user/Casaos/CasaOS_Guia_de_Usuario.pdf"
    doc = SimpleDocTemplate(
        out, pagesize=A4,
        leftMargin=2 * cm, rightMargin=2 * cm,
        topMargin=2.5 * cm, bottomMargin=2.8 * cm,
        title="CasaOS – Guía de Usuario",
        author="CasaOS",
    )
    story = []

    # ── COVER ──────────────────────────────────────────────────────────────
    story += [
        sp(70),
        Paragraph("🏠 CasaOS", COVER_T),
        sp(6),
        Paragraph("Guía de Usuario", COVER_S),
        sp(10),
        Paragraph("Tu hogar digital, siempre en sincronía.", COVER_G),
        sp(36),
    ]
    # feature badges grid
    badge_data = [
        [("📋 Tablero", AMBER), ("📅 Agenda", BLUE),  ("🍽 Recetas", GREEN)],
        [("🛒 Compras",  ORANGE),("💰 Finanzas", PURPLE),("📁 Proyectos", PINK)],
    ]
    for badge_row in badge_data:
        cells = [Paragraph(lbl, BADGE) for lbl, _ in badge_row]
        t = Table([cells], colWidths=[USABLE / 3] * 3)
        style = [
            ("ALIGN",         (0, 0), (-1, -1), "CENTER"),
            ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING",    (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("INNERGRID",     (0, 0), (-1, -1), 4, BG),
            ("BOX",           (0, 0), (-1, -1), 0, colors.transparent),
        ]
        for i, (_, bg) in enumerate(badge_row):
            style += [
                ("BACKGROUND", (i, 0), (i, 0), bg),
                ("TEXTCOLOR",  (i, 0), (i, 0), BG),
            ]
        t.setStyle(TableStyle(style))
        story.append(t)
        story.append(sp(4))
    story += [sp(50), Paragraph("Versión 1.0  ·  2025", COVER_G), PageBreak()]

    # ── TABLE OF CONTENTS ──────────────────────────────────────────────────
    story += [sp(10), Paragraph("Contenido", H1), hr()]
    toc = [
        ("1",  "Introducción – ¿Qué es CasaOS?"),
        ("2",  "Primeros Pasos – Registro e Inicio de Sesión"),
        ("3",  "Navegación Principal"),
        ("4",  "Inicio – Tablero y Tareas"),
        ("5",  "Agenda – Calendario y Momentos"),
        ("6",  "Recetas – Tu Recetario Digital"),
        ("7",  "Compras – Lista del Súper"),
        ("8",  "Finanzas – Control Económico del Hogar"),
        ("9",  "Proyectos – Gestión de Metas"),
        ("10", "Ajustes y Perfil"),
        ("11", "Consejos y Trucos"),
    ]
    for num, title in toc:
        t = Table(
            [[Paragraph(num, TOC_N), Paragraph(title, TOC_T)]],
            colWidths=[1.4 * cm, USABLE - 1.4 * cm],
        )
        t.setStyle(TableStyle([
            ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING",    (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LINEBELOW",     (0, 0), (-1, -1), 0.3, CARD2),
        ]))
        story.append(t)
    story.append(PageBreak())

    # ── 1  INTRODUCCIÓN ────────────────────────────────────────────────────
    story += [
        section_header("🏠", "Introducción", "¿Qué es CasaOS?", AMBER),
        sp(10),
        Paragraph(
            "CasaOS es la aplicación todo-en-uno diseñada para parejas que quieren mantener "
            "su hogar organizado, sus finanzas bajo control y sus momentos especiales bien "
            "documentados. Con CasaOS, tú y tu pareja siempre estarán en la misma página.",
            BODY,
        ),
        sp(8),
        feature_row(
            "📋", "Tablero centralizado",
            "Ve de un vistazo notas, tareas y elementos destacados del hogar.",
            "🔄", "Sincronización en tiempo real",
            "Los cambios de tu pareja aparecen al instante en tu pantalla.",
        ),
        sp(6),
        feature_row(
            "📱", "Diseño móvil primero",
            "Interfaz optimizada para smartphone, con navegación en la parte inferior.",
            "🔒", "Privacidad por hogar",
            "Tu información es exclusiva del hogar. Solo tú y tu pareja tienen acceso.",
        ),
        sp(12),
        Paragraph("¿Qué módulos incluye?", H2),
    ]
    modules = [
        ("🏠 Inicio",     AMBER,  "Tablero con notas rápidas y lista de tareas del hogar."),
        ("📅 Agenda",     BLUE,   "Calendario semanal, eventos y momentos en pareja."),
        ("🍽 Recetas",    GREEN,  "Recetario digital con modo cocina y lista de ingredientes."),
        ("🛒 Compras",    ORANGE, "Lista del súper categorizada y compartida."),
        ("💰 Finanzas",   PURPLE, "Gastos, ingresos, metas de ahorro y balance mensual."),
        ("📁 Proyectos",  PINK,   "Proyectos del hogar con tareas, presupuesto y progreso."),
    ]
    LABEL_W = 3.8 * cm
    for icon_lbl, col, desc in modules:
        t = Table(
            [[Paragraph(f"<b>{icon_lbl}</b>",
                        S("ml", fontName="Helvetica-Bold", fontSize=10, textColor=col,
                          leading=14)),
              Paragraph(desc, BODYG)]],
            colWidths=[LABEL_W, USABLE - LABEL_W],
        )
        t.setStyle(TableStyle([
            ("ROWBACKGROUNDS", (0, 0), (-1, -1), [CARD, CARD2]),
            ("VALIGN",         (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING",     (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING",  (0, 0), (-1, -1), 7),
            ("LEFTPADDING",    (0, 0), (-1, -1), 10),
            ("LINEBELOW",      (0, 0), (-1, -1), 0.3, BG),
        ]))
        story.append(t)
    story.append(PageBreak())

    # ── 2  PRIMEROS PASOS ──────────────────────────────────────────────────
    story += [
        section_header("🚀", "Primeros Pasos", "Registro, inicio de sesión e invitación", AMBER),
        sp(10),
        Paragraph("Opciones de acceso", H2),
        Paragraph(
            "CasaOS usa Supabase Auth para gestionar el acceso de forma segura. "
            "Puedes entrar de dos maneras:",
            BODY,
        ),
        sp(8),
        step_box(1, "Crear una cuenta nueva",
                 "Registra tu correo y contraseña en la pantalla de inicio. "
                 "Crea tu hogar y elige el nombre que lo representará."),
        sp(6),
        step_box(2, "Unirte mediante invitación",
                 "Si tu pareja ya tiene CasaOS, pídele que te envíe un enlace desde "
                 "Ajustes → Invitar. El enlace es de un solo uso."),
        sp(6),
        step_box(3, "Iniciar sesión",
                 "Si ya tienes cuenta, ingresa tu correo y contraseña. "
                 "Activa 'Recordarme' para no volver a ingresar."),
        sp(12),
        info_box(
            "Invitar a tu pareja",
            [
                "• Ve a Ajustes (ícono de engranaje en la parte superior)",
                "• Toca 'Invitar a alguien a tu hogar'",
                "• Ingresa el correo de tu pareja y envía la invitación",
                "• Tu pareja recibirá un enlace único para unirse al hogar",
                "→ Solo puede existir una invitación activa a la vez",
            ],
            AMBER, "📧",
        ),
        PageBreak(),
    ]

    # ── 3  NAVEGACIÓN ──────────────────────────────────────────────────────
    story += [
        section_header("🧭", "Navegación Principal", "Cómo moverte por la app", AMBER),
        sp(10),
        Paragraph(
            "CasaOS usa una barra de navegación fija en la parte inferior de la pantalla. "
            "Toca cualquier ícono para cambiar de sección al instante.",
            BODY,
        ),
        sp(10),
        nav_bar(),
        sp(14),
        data_table(
            ["Sección", "Descripción"],
            [
                ("Inicio",    "Tablero de notas y lista de tareas del hogar."),
                ("Agenda",    "Calendario semanal y momentos en pareja."),
                ("Recetas",   "Recetario con ingredientes e instrucciones."),
                ("Compras",   "Lista del súper organizada por categorías."),
                ("Finanzas",  "Gastos, ingresos y metas de ahorro."),
                ("Proyectos", "Proyectos del hogar con tareas y presupuesto."),
            ],
            [3.5 * cm, USABLE - 3.5 * cm],
        ),
        sp(12),
        info_box(
            "Botón + (Agregar)",
            [
                "• En cada sección hay un botón  +  flotante (esquina inferior derecha).",
                "• Tócalo para crear un nuevo elemento en esa sección.",
                "→ El formulario aparece como ventana emergente desde la parte inferior.",
            ],
            AMBER, "➕",
        ),
        PageBreak(),
    ]

    # ── 4  INICIO ──────────────────────────────────────────────────────────
    story += [
        section_header("📋", "Inicio", "Tablero y Tareas del hogar", AMBER),
        sp(10),
        Paragraph(
            "La pantalla de Inicio es tu centro de control. Tiene dos pestañas: "
            "<b>Tablero</b> (notas y elementos importantes) y <b>Tareas</b> "
            "(responsabilidades del hogar).",
            BODY,
        ),
        sp(10),
        Paragraph("Pestaña: Tablero", H2),
        info_box(
            "Sección 'Atención'",
            [
                "• Muestra automáticamente ítems importantes de otras secciones.",
                "• Pagos próximos, eventos del día y tareas atrasadas aparecen aquí.",
                "→ No se agregan ítems manualmente; se llenan solos.",
            ],
            RED, "🔴",
        ),
        sp(8),
        info_box(
            "Notas del Hogar",
            [
                "• Toca el botón  +  para agregar una nota rápida.",
                "• Escribe el contenido en el campo 'Escribe una nota para el hogar…'.",
                "• Toca 'Agregar' para guardarla o 'Cancelar' para descartarla.",
                "• Las notas aparecen como tarjetas en el tablero.",
                "→ Para eliminar una nota, toca el ícono de papelera en la tarjeta.",
            ],
            AMBER, "📝",
        ),
        sp(8),
        info_box(
            "Ítems Fijados (desde otras secciones)",
            [
                "• Desde Recetas, Compras, Proyectos o Momentos puedes 'Fijar al tablero'.",
                "• El ítem aparece en el Tablero con su categoría de origen.",
                "• Tipos posibles: Proyecto, Tarea, Receta, Compras, Momento, Nota.",
                "→ Para desfijarlo, toca el ícono de pin en la sección original.",
            ],
            BLUE, "📌",
        ),
        sp(12),
        Paragraph("Pestaña: Tareas", H2),
        Paragraph(
            "Gestiona las responsabilidades del hogar con tareas recurrentes o únicas.",
            BODY,
        ),
        sp(8),
        data_table(
            ["Frecuencia", "Cuándo se resetea"],
            [
                ("Diaria",     "Todos los días."),
                ("Semanal",    "Cada semana."),
                ("Quincenal",  "Cada dos semanas."),
                ("Mensual",    "El mismo día cada mes."),
                ("Única vez",  "Solo se completa una vez y no vuelve a aparecer."),
            ],
            [3.8 * cm, USABLE - 3.8 * cm],
        ),
        sp(8),
        info_box(
            "Crear una tarea",
            [
                "• Toca  +  → escribe el nombre en 'Nombre de la tarea…'.",
                "• Elige la frecuencia: Diaria / Semanal / Quincenal / Mensual / Única vez.",
                "• Asigna la tarea: 'Yo' o el nombre de tu pareja.",
                "• Toca 'Agregar' para guardar.",
                "→ Las tareas completadas pasan a la sección 'Completadas hoy'.",
            ],
            AMBER, "✅",
        ),
        PageBreak(),
    ]

    # ── 5  AGENDA ──────────────────────────────────────────────────────────
    story += [
        section_header("📅", "Agenda", "Calendario y Momentos en pareja", BLUE),
        sp(10),
        Paragraph(
            "La Agenda combina un calendario semanal para eventos del hogar y "
            "una sección especial de <b>Momentos</b> para actividades en pareja.",
            BODY,
        ),
        sp(10),
        Paragraph("Calendario Semanal", H2),
        info_box(
            "Vista de la semana",
            [
                "• Navega entre semanas con las flechas  ←  y  →.",
                "• Los días L M X J V S D se muestran en la fila superior.",
                "• Toca un día para ver sus eventos en el listado inferior.",
                "• El día de hoy aparece resaltado con color ámbar.",
                "→ Todos los eventos de la semana se listan debajo del calendario.",
            ],
            BLUE, "📅",
        ),
        sp(8),
        info_box(
            "Agregar un evento",
            [
                "• Toca el botón  +  (esquina inferior derecha).",
                "• Escribe el nombre del evento.",
                "• Marca 'Todo el día' si no tiene hora específica.",
                "• Si tiene hora, aparecen campos de hora inicio y fin.",
                "• Elige la etiqueta del tipo de evento (ver tabla de colores abajo).",
                "• Agrega un link opcional (Google Meet, reservación, web, etc.).",
                "• Toca 'Agregar' para guardar.",
            ],
            BLUE, "➕",
        ),
        sp(10),
        Paragraph("Etiquetas de eventos:", H3),
        color_pills([
            ("Médico",        BLUE),
            ("Social",        GREEN),
            ("Pagos",         RED),
            ("Mantenimiento", ORANGE),
            ("Momento",       PURPLE),
        ]),
        sp(12),
        Paragraph("Momentos en Pareja", H2),
        Paragraph(
            "La sección de Momentos te ayuda a planear y recordar actividades especiales "
            "en pareja. Puedes agregar ideas, links e incluso pedir una sugerencia aleatoria.",
            BODY,
        ),
        sp(8),
        info_box(
            "Agregar un momento",
            [
                "• En la sección 'Momentos', toca el botón  +.",
                "• Escribe la actividad en '¿Qué quieren hacer?'.",
                "• Elige categoría: Cita / Viaje / Experiencia / En casa / Cultura / Gastro / Aventura.",
                "• Agrega un link opcional (TikTok, Instagram, web...).",
                "• Agrega un link de Google Maps si tiene ubicación.",
                "• Toca 'Agregar' para guardar.",
            ],
            PURPLE, "💑",
        ),
        sp(8),
        info_box(
            "Sugerencia aleatoria",
            [
                "• Toca el ícono de dados para obtener una sugerencia aleatoria.",
                "• CasaOS elegirá uno de tus momentos guardados al azar.",
                "• Puedes fijar momentos al tablero con 'Agregar al tablero'.",
            ],
            PURPLE, "🎲",
        ),
        PageBreak(),
    ]

    # ── 6  RECETAS ─────────────────────────────────────────────────────────
    story += [
        section_header("🍽", "Recetas", "Tu recetario digital", GREEN),
        sp(10),
        Paragraph(
            "Guarda todas tus recetas favoritas con ingredientes e instrucciones. "
            "El modo cocina te guía paso a paso mientras preparas el platillo.",
            BODY,
        ),
        sp(10),
        Paragraph("Categorías de recetas", H2),
        color_pills([
            ("Todas",    GRAY2),
            ("Desayuno", ORANGE),
            ("Comida",   GREEN),
            ("Cena",     BLUE),
            ("Snack",    PURPLE),
            ("Otro",     GRAY),
        ]),
        sp(12),
        Paragraph("Agregar una receta", H2),
        info_box(
            "Crear nueva receta",
            [
                "• Toca el botón  +  para abrir el formulario 'Nueva receta'.",
                "• Escribe el nombre de la receta.",
                "• Selecciona la categoría (Desayuno / Comida / Cena / Snack / Otro).",
                "• En 'Ingredientes — uno por línea', escribe cada ingrediente en su propio renglón.",
                "• En 'Descripción / Instrucciones (opcional)' agrega los pasos.",
                "• Toca 'Guardar' cuando termines.",
            ],
            GREEN, "📝",
        ),
        sp(10),
        Paragraph("Usar una receta", H2),
        info_box(
            "Modo Cocina",
            [
                "• Toca una tarjeta de receta para ver sus detalles.",
                "• Toca 'Modo cocina' para activar el modo guiado.",
                "• Ve marcando ingredientes uno a uno: verás '{X}/{Y} listos'.",
                "• Lee las instrucciones en la sección inferior.",
            ],
            GREEN, "👨‍🍳",
        ),
        sp(8),
        info_box(
            "Enviar ingredientes a la Lista de Compras",
            [
                "• Abre la receta y toca el botón 'A compras'.",
                "• Todos los ingredientes se agregan automáticamente a tu Lista de Compras.",
                "• Aparecerán en la categoría 'Abarrotes' por defecto.",
                "→ Puedes cambiar la categoría de cada ingrediente desde la sección Compras.",
            ],
            ORANGE, "🛒",
        ),
        PageBreak(),
    ]

    # ── 7  COMPRAS ─────────────────────────────────────────────────────────
    story += [
        section_header("🛒", "Compras", "Lista del súper compartida", ORANGE),
        sp(10),
        Paragraph(
            "La lista de compras es compartida entre tú y tu pareja en tiempo real. "
            "Organiza los artículos por categorías para facilitar el recorrido en el supermercado.",
            BODY,
        ),
        sp(10),
        Paragraph("Categorías disponibles", H2),
        data_table(
            ["Categoría", "Ejemplos de artículos"],
            [
                ("Frutas y Verduras", "Manzanas, zanahorias, espinacas, tomates..."),
                ("Lácteos",           "Leche, queso, yogur, mantequilla..."),
                ("Carnes",            "Pollo, res, cerdo, mariscos..."),
                ("Panadería",         "Pan, tortillas, galletas, pasteles..."),
                ("Bebidas",           "Agua, jugos, refrescos, café..."),
                ("Limpieza",          "Detergente, cloro, esponja, escoba..."),
                ("Higiene",           "Shampoo, jabón, pasta dental, rastrillos..."),
                ("Abarrotes",         "Arroz, frijoles, aceite, sal, especias..."),
                ("Otros",             "Artículos que no encajan en las categorías anteriores."),
            ],
            [3.8 * cm, USABLE - 3.8 * cm],
        ),
        sp(12),
        Paragraph("Cómo usar la lista", H2),
        info_box(
            "Agregar un artículo",
            [
                "• Toca  +  → escribe qué necesitas en '¿Qué necesitas comprar?'.",
                "• Selecciona la categoría con los botones de selección.",
                "• Toca 'Agregar' para guardarlo en la lista.",
            ],
            ORANGE, "➕",
        ),
        sp(8),
        info_box(
            "Marcar como comprado",
            [
                "• Toca el círculo a la izquierda del artículo para tacharlo.",
                "• El artículo se mueve visualmente al final de su categoría.",
                "• Para desmarcar, vuelve a tocar el círculo.",
            ],
            GREEN, "✅",
        ),
        sp(8),
        info_box(
            "Limpiar artículos comprados",
            [
                "• Cuando hay artículos marcados, aparece el botón 'Limpiar (X)' en la cabecera.",
                "• Tócalo para eliminar todos los artículos ya comprados de una sola vez.",
                "→ Esta acción no se puede deshacer.",
            ],
            RED, "🗑",
        ),
        PageBreak(),
    ]

    # ── 8  FINANZAS ────────────────────────────────────────────────────────
    story += [
        section_header("💰", "Finanzas", "Control económico del hogar", PURPLE),
        sp(10),
        Paragraph(
            "El módulo de Finanzas te permite controlar tanto los gastos del hogar "
            "como tus finanzas personales. Tiene tres pestañas: <b>Hogar</b>, "
            "<b>Personal</b> y <b>Resumen</b>.",
            BODY,
        ),
        sp(10),
        Paragraph("Pestaña: Hogar", H2),
        info_box(
            "Compromisos del hogar",
            [
                "• Son los gastos recurrentes mensuales: renta, servicios, streaming, etc.",
                "• Muestra quién paga cada gasto (tú, tu pareja o sin asignar).",
                "• Los gastos con fecha próxima aparecen en 'Por pagar'.",
                "• Los ya pagados este mes aparecen en 'Pagado'.",
            ],
            PURPLE, "🏠",
        ),
        sp(8),
        info_box(
            "Agregar un gasto fijo",
            [
                "• Toca  +  → selecciona 'Gasto fijo del hogar'.",
                "• Escribe el título (ej. 'Netflix', 'Renta', 'Internet').",
                "• Ingresa el monto mensual.",
                "• Selecciona el día del mes en que se paga.",
                "• Asigna quién paga: tu nombre, el de tu pareja o 'Sin asignar'.",
                "• Toca 'Agregar'.",
            ],
            PURPLE, "➕",
        ),
        sp(8),
        info_box(
            "Metas de ahorro",
            [
                "• Crea metas con nombre, monto objetivo y fecha límite opcional.",
                "• Toca 'Abonar' para registrar depósitos hacia la meta.",
                "• Una barra de progreso muestra cuánto llevan ahorrado.",
                "→ Las metas pueden vincularse a un Proyecto desde la sección Proyectos.",
            ],
            GREEN, "🎯",
        ),
        sp(10),
        Paragraph("Pestaña: Personal", H2),
        info_box(
            "Balance personal del mes",
            [
                "• Muestra tus ingresos, gastos y balance neto del mes actual.",
                "• Navega entre meses con las flechas  ←  →  en la cabecera.",
                "• 'Cuentas divididas': gastos compartidos con tu pareja.",
                "• Si tu pareja te debe, verás '{Pareja} te debe: $XXX'.",
                "• Si tú le debes, verás 'Le debes a {Pareja}: $XXX'.",
                "→ Toca 'Saldar' cuando liquiden la deuda entre ambos.",
            ],
            BLUE, "👤",
        ),
        sp(8),
        info_box(
            "Agregar un movimiento",
            [
                "• Toca  +  → 'Nuevo movimiento'.",
                "• Elige tipo: Gasto o Ingreso.",
                "• Elige alcance: Hogar o Personal.",
                "• Escribe el título y el monto.",
                "• Selecciona categoría: Comida / Casa / Servicios / Entretenimiento / Salud / Transporte / Ropa / Otros.",
                "• Marca si está Pendiente o Pagado.",
                "• Activa 'Dividir con {Pareja}' para dividir el gasto a la mitad.",
            ],
            BLUE, "💸",
        ),
        sp(10),
        Paragraph("Pestaña: Resumen", H2),
        info_box(
            "Análisis financiero mensual",
            [
                "• Gráfica de tendencia de los últimos 6 meses.",
                "• Desglose de gastos personales por categoría del mes actual.",
                "• Lista de todos los compromisos mensuales del hogar.",
                "• Cuentas pendientes entre tú y tu pareja.",
            ],
            AMBER, "📊",
        ),
        PageBreak(),
    ]

    # ── 9  PROYECTOS ───────────────────────────────────────────────────────
    story += [
        section_header("📁", "Proyectos", "Gestión de metas del hogar", PINK),
        sp(10),
        Paragraph(
            "Los Proyectos te permiten organizar iniciativas grandes del hogar: "
            "remodelaciones, viajes, compras importantes, etc. Cada proyecto tiene "
            "tareas, presupuesto y puede vincularse a una meta de ahorro.",
            BODY,
        ),
        sp(10),
        Paragraph("Estados de un proyecto", H2),
        color_pills([
            ("Planeando",   AMBER),
            ("En progreso", BLUE),
            ("Terminado",   GREEN),
        ]),
        sp(12),
        info_box(
            "Crear un proyecto",
            [
                "• Toca  +  → escribe el nombre del proyecto.",
                "• Selecciona el estado inicial (generalmente 'Planeando').",
                "• Agrega una descripción opcional: objetivos, notas, contexto.",
                "• Agrega un presupuesto total si aplica.",
                "• Toca 'Guardar'.",
            ],
            PINK, "📝",
        ),
        sp(8),
        info_box(
            "Gestionar tareas del proyecto",
            [
                "• Toca un proyecto para ver su detalle.",
                "• En la sección 'Tareas', escribe el nombre de cada tarea.",
                "• Agrega un costo opcional a cada tarea ($).",
                "• Toca 'Agregar tarea' para guardarla.",
                "• Marca las tareas completadas con el checkbox.",
                "• El progreso se muestra como '{X}/{Y} tareas' en la tarjeta.",
            ],
            PINK, "✅",
        ),
        sp(8),
        info_box(
            "Presupuesto y meta de ahorro",
            [
                "• El presupuesto consumido se calcula sumando el costo de las tareas.",
                "• En 'Meta de ahorro', vincula el proyecto a una meta de Finanzas.",
                "• Así puedes ver el progreso de ahorro directamente en el proyecto.",
                "→ Fija proyectos al tablero con 'Agregar al tablero'.",
            ],
            GREEN, "💰",
        ),
        PageBreak(),
    ]

    # ── 10  AJUSTES ────────────────────────────────────────────────────────
    story += [
        section_header("⚙️", "Ajustes y Perfil", "Configura tu cuenta y hogar", GRAY),
        sp(10),
        Paragraph(
            "Accede a los Ajustes desde el ícono de engranaje en la parte superior de la pantalla.",
            BODY,
        ),
        sp(10),
        info_box(
            "Opciones en Ajustes",
            [
                "• Ver y editar tu nombre de perfil.",
                "• Ver el nombre de tu hogar y editarlo.",
                "• Ver los miembros de tu hogar (tú y tu pareja).",
                "• Invitar a alguien al hogar (genera un token único por correo).",
                "• Cerrar sesión de forma segura.",
            ],
            GRAY, "⚙️",
        ),
        sp(8),
        info_box(
            "Gestión del hogar",
            [
                "• El 'Hogar' es la unidad central: todos los datos pertenecen al hogar.",
                "• Solo puede haber 2 miembros por hogar (una pareja).",
                "• El nombre del hogar aparece como título en la pantalla de Inicio.",
                "→ Si necesitas cambiar de hogar, contacta al soporte de CasaOS.",
            ],
            AMBER, "🏠",
        ),
        PageBreak(),
    ]

    # ── 11  CONSEJOS ───────────────────────────────────────────────────────
    story += [
        section_header("💡", "Consejos y Trucos", "Saca el máximo provecho de CasaOS", AMBER),
        sp(12),
    ]
    tips = [
        ("Usa el Tablero como panel de control",
         "Fija las cosas más importantes de cada sección al tablero para tenerlas siempre "
         "visibles: la receta de la semana, el proyecto activo, la lista de compras."),
        ("Activa los gastos divididos",
         "Cuando compartas un gasto con tu pareja (cena, viaje, etc.) usa 'Dividir con {Pareja}' "
         "para que CasaOS lleve el registro de quién le debe a quién de forma automática."),
        ("Sincroniza recetas con compras",
         "Antes de ir al súper, abre la receta que vas a cocinar y toca 'A compras'. "
         "Todos los ingredientes se agregan solos a tu lista de compras."),
        ("Usa etiquetas en el calendario",
         "Las etiquetas de eventos (Médico, Social, Pagos, etc.) te ayudan a identificar "
         "visualmente qué tipo de compromisos tienes durante la semana."),
        ("La sección 'Atención' es tu alarma diaria",
         "Revisa diariamente la sección 'Atención' en el Tablero. Ahí aparecen pagos "
         "próximos, tareas atrasadas y eventos importantes del día."),
        ("Proyectos + Metas de ahorro",
         "Vincula cada proyecto con una meta de ahorro para ver en un solo lugar cuánto "
         "has ahorrado y cuánto te falta para completar el proyecto."),
    ]
    for i, (title, desc) in enumerate(tips, 1):
        story.append(KeepTogether([step_box(i, title, desc), sp(6)]))
    story += [
        sp(12),
        info_box(
            "¿Tienes problemas o sugerencias?",
            [
                "• CasaOS está en constante mejora basándose en el feedback de los usuarios.",
                "• Si encuentras algún error, toma una captura de pantalla y compártela.",
                "• ¿Tienes una idea para una función nueva? ¡Cuéntanosla!",
                "→ Escríbenos a través del canal de soporte de tu hogar.",
            ],
            AMBER, "❓",
        ),
        sp(20),
        Paragraph("¡Bienvenidos a CasaOS!", H1),
        Paragraph(
            "Esperamos que esta guía te ayude a sacar el máximo provecho de la aplicación. "
            "Recuerda que CasaOS está diseñado para que tú y tu pareja estén siempre "
            "en sincronía y su hogar funcione de la mejor manera posible.",
            BODY,
        ),
    ]

    # ── RENDER ─────────────────────────────────────────────────────────────
    doc.build(story, onFirstPage=cover_page, onLaterPages=bg_page)
    print(f"PDF generado: {out}")


if __name__ == "__main__":
    build()
