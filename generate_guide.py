#!/usr/bin/env python3
"""Generate CasaOS user guide PDF — compact layout, minimal pages."""

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether, PageBreak,
)

PAGE_W, PAGE_H = A4

# ── Palette ──────────────────────────────────────────────────────────────────
BG     = colors.HexColor("#0f0f0f")
CARD   = colors.HexColor("#1a1a1a")
CARD2  = colors.HexColor("#222222")
AMBER  = colors.HexColor("#fbbf24")
WHITE  = colors.HexColor("#ffffff")
GRAY   = colors.HexColor("#9ca3af")
GRAY2  = colors.HexColor("#6b7280")
GREEN  = colors.HexColor("#4ade80")
BLUE   = colors.HexColor("#60a5fa")
PURPLE = colors.HexColor("#a78bfa")
RED    = colors.HexColor("#f87171")
ORANGE = colors.HexColor("#fb923c")
PINK   = colors.HexColor("#f472b6")

# Tight margins → more usable area
LM = RM = 1.2 * cm
TM = BM = 1.4 * cm
USABLE = PAGE_W - LM - RM
HALF   = (USABLE - 5) / 2   # half-width for 2-col layout


# ── Styles ───────────────────────────────────────────────────────────────────
def S(name, **kw):
    d = dict(fontName="Helvetica", fontSize=8, textColor=WHITE,
             leading=11, spaceAfter=0, spaceBefore=0)
    d.update(kw)
    return ParagraphStyle(name, **d)

H1     = S("H1", fontName="Helvetica-Bold", fontSize=13, textColor=AMBER,
           spaceBefore=6, spaceAfter=3, leading=16)
H2     = S("H2", fontName="Helvetica-Bold", fontSize=10, textColor=WHITE,
           spaceBefore=5, spaceAfter=2, leading=13)
H3     = S("H3", fontName="Helvetica-Bold", fontSize=9,  textColor=AMBER,
           spaceBefore=4, spaceAfter=2, leading=12)
BODY   = S("BODY", fontSize=8, leading=12, spaceAfter=3)
BODYG  = S("BODYG", fontSize=8, textColor=GRAY, leading=11, spaceAfter=2)
# Cover
CT     = S("CT", fontName="Helvetica-Bold", fontSize=32, textColor=AMBER,
           alignment=TA_CENTER, leading=38)
CS     = S("CS", fontName="Helvetica-Bold", fontSize=13, textColor=WHITE,
           alignment=TA_CENTER, leading=17)
CG     = S("CG", fontSize=9, textColor=GRAY, alignment=TA_CENTER, leading=13)
# Table cells
TH     = S("TH", fontName="Helvetica-Bold", fontSize=8, textColor=BG,
           alignment=TA_CENTER, leading=10)
TD     = S("TD", fontSize=8, textColor=WHITE,  leading=11)
TDG    = S("TDG", fontSize=8, textColor=GRAY,  leading=11)
# Box internals
BT     = S("BT", fontName="Helvetica-Bold", fontSize=8, textColor=WHITE,
           leading=11, spaceAfter=2)
BB     = S("BB", fontSize=7.5, textColor=GRAY, leading=11, spaceAfter=0)
BA     = S("BA", fontSize=7.5, textColor=AMBER, leading=11, spaceAfter=0)
# Nav / pills
PILL   = S("PILL", fontName="Helvetica-Bold", fontSize=8, textColor=BG,
           alignment=TA_CENTER, leading=11)
NAV_IC = S("NI", fontName="Helvetica-Bold", fontSize=13, textColor=AMBER,
           alignment=TA_CENTER, leading=17)
NAV_LB = S("NL", fontSize=7, textColor=GRAY2, alignment=TA_CENTER, leading=9)
# Section header
SHT    = S("SHT", fontName="Helvetica-Bold", fontSize=11, textColor=WHITE, leading=14)
SHS    = S("SHS", fontSize=8, textColor=GRAY, leading=11)
# Step
SN     = S("SN", fontName="Helvetica-Bold", fontSize=11, textColor=BG,
           alignment=TA_CENTER, leading=14)
ST_    = S("ST", fontName="Helvetica-Bold", fontSize=8, textColor=WHITE,
           leading=11, spaceAfter=1)
SD     = S("SD", fontSize=7.5, textColor=GRAY, leading=10)
# TOC
TOC_N  = S("TN", fontName="Helvetica-Bold", fontSize=9, textColor=AMBER, leading=14)
TOC_T  = S("TT", fontSize=9, textColor=WHITE, leading=14)
BADGE  = S("BA2", fontName="Helvetica-Bold", fontSize=9, textColor=BG,
           alignment=TA_CENTER, leading=12)


def sp(n=5):
    return Spacer(1, n)

def hr():
    return HRFlowable(width="100%", thickness=0.4, color=CARD2,
                      spaceAfter=4, spaceBefore=2)

# ── Components ────────────────────────────────────────────────────────────────

def _box_inner(title, bullets, accent, icon, width):
    """Build the inner content of a colored accent box for a given width."""
    label = f"{icon}  {title}" if icon else title
    content = [Paragraph(f"<b>{label}</b>", BT)]
    for b in bullets:
        style = BA if b.startswith("→") else BB
        content.append(Paragraph(b, style))
    t = Table([["", content]], colWidths=[6, width - 6])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (0, -1), accent),
        ("BACKGROUND",    (1, 0), (1, -1), CARD),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING",    (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LEFTPADDING",   (1, 0), (1, -1), 8),
        ("RIGHTPADDING",  (1, 0), (1, -1), 8),
        ("LEFTPADDING",   (0, 0), (0, -1), 0),
        ("RIGHTPADDING",  (0, 0), (0, -1), 0),
    ]))
    return t


def box(title, bullets, accent=AMBER, icon=""):
    return _box_inner(title, bullets, accent, icon, USABLE)


def box2(title_l, bullets_l, accent_l, icon_l,
         title_r, bullets_r, accent_r, icon_r):
    """Two info-boxes side by side."""
    l = _box_inner(title_l, bullets_l, accent_l, icon_l, HALF)
    r = _box_inner(title_r, bullets_r, accent_r, icon_r, HALF)
    t = Table([[l, r]], colWidths=[HALF, HALF])
    t.setStyle(TableStyle([
        ("LEFTPADDING",  (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING",   (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 0),
        ("INNERGRID",    (0, 0), (-1, -1), 5, BG),
    ]))
    return t


def section_hdr(icon, title, subtitle, accent=AMBER):
    t = Table(
        [[Paragraph(icon, S("ic", fontName="Helvetica-Bold", fontSize=14,
                             textColor=BG, alignment=TA_CENTER, leading=18)),
          [Paragraph(title, SHT), Paragraph(subtitle, SHS)]]],
        colWidths=[34, USABLE - 34],
    )
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (0, -1), accent),
        ("BACKGROUND",    (1, 0), (1, -1), CARD),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING",   (1, 0), (1, -1), 10),
        ("RIGHTPADDING",  (1, 0), (1, -1), 8),
        ("LEFTPADDING",   (0, 0), (0, -1), 4),
        ("RIGHTPADDING",  (0, 0), (0, -1), 4),
    ]))
    return t


def step_box(number, title, desc):
    t = Table(
        [[Paragraph(str(number), SN),
          [Paragraph(title, ST_), Paragraph(desc, SD)]]],
        colWidths=[28, USABLE - 28],
    )
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (0, -1), AMBER),
        ("BACKGROUND",    (1, 0), (1, -1), CARD),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LEFTPADDING",   (1, 0), (1, -1), 10),
        ("RIGHTPADDING",  (1, 0), (1, -1), 8),
    ]))
    return t


def dtable(headers, rows, cws=None):
    if cws is None:
        cws = [USABLE / len(headers)] * len(headers)
    hr_row = [Paragraph(h, TH) for h in headers]
    body   = [[Paragraph(str(c), TD if i == 0 else TDG)
               for i, c in enumerate(r)] for r in rows]
    t = Table([hr_row] + body, colWidths=cws)
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0),  AMBER),
        ("TEXTCOLOR",     (0, 0), (-1, 0),  BG),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [CARD, CARD2]),
        ("TEXTCOLOR",     (0, 1), (-1, -1), WHITE),
        ("ALIGN",         (0, 0), (-1, 0),  "CENTER"),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING",   (0, 0), (-1, -1), 7),
        ("INNERGRID",     (0, 0), (-1, -1), 0.3, BG),
        ("BOX",           (0, 0), (-1, -1), 0, colors.transparent),
    ]))
    return t


def pills(items):
    """[(label, bg_color), ...]  →  compact pill row."""
    cw = USABLE / len(items)
    cells = [Paragraph(lbl, PILL) for lbl, _ in items]
    t = Table([cells], colWidths=[cw] * len(items))
    style = [
        ("ALIGN",         (0, 0), (-1, -1), "CENTER"),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("INNERGRID",     (0, 0), (-1, -1), 2, BG),
        ("BOX",           (0, 0), (-1, -1), 0, colors.transparent),
    ]
    for i, (_, bg) in enumerate(items):
        style += [("BACKGROUND", (i, 0), (i, 0), bg),
                  ("TEXTCOLOR",  (i, 0), (i, 0), BG)]
    t.setStyle(TableStyle(style))
    return t


def nav_bar():
    items = [("⌂","Inicio"),("▦","Agenda"),("✦","Recetas"),
             ("◉","Compras"),("$","Finanzas"),("◈","Proyectos")]
    cw = USABLE / len(items)
    icons  = [Paragraph(ic, NAV_IC) for ic, _ in items]
    labels = [Paragraph(lb, NAV_LB) for _, lb in items]
    t = Table([icons, labels], colWidths=[cw]*len(items), rowHeights=[22, 13])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), CARD),
        ("BACKGROUND",    (0, 0), (0,  1),  AMBER),
        ("TEXTCOLOR",     (0, 0), (0,  1),  BG),
        ("ALIGN",         (0, 0), (-1, -1), "CENTER"),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("INNERGRID",     (0, 0), (-1, -1), 1, BG),
    ]))
    return t


def feat2(icon_l, title_l, desc_l, icon_r, title_r, desc_r):
    def cell(ic, ti, de):
        return [Paragraph(ic,  S("fi", fontName="Helvetica-Bold", fontSize=16,
                                  textColor=AMBER, leading=20)),
                Paragraph(ti,  S("ft", fontName="Helvetica-Bold", fontSize=8,
                                  textColor=WHITE, leading=11, spaceBefore=2)),
                Paragraph(de,  S("fd", fontSize=7.5, textColor=GRAY, leading=10))]
    t = Table([[cell(icon_l,title_l,desc_l), cell(icon_r,title_r,desc_r)]],
              colWidths=[HALF, HALF])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,-1), CARD),
        ("VALIGN",        (0,0),(-1,-1), "TOP"),
        ("TOPPADDING",    (0,0),(-1,-1), 8),
        ("BOTTOMPADDING", (0,0),(-1,-1), 8),
        ("LEFTPADDING",   (0,0),(-1,-1), 10),
        ("RIGHTPADDING",  (0,0),(-1,-1), 10),
        ("LINEAFTER",     (0,0),(0,-1),  4, BG),
    ]))
    return t


# ── Page templates ────────────────────────────────────────────────────────────
def bg(c, doc):
    c.saveState()
    c.setFillColor(BG)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setFillColor(GRAY2)
    c.setFont("Helvetica", 7)
    c.drawCentredString(PAGE_W/2, 0.7*cm,
                        f"CasaOS  ·  Guía de Usuario  ·  Página {doc.page}")
    c.setStrokeColor(CARD2)
    c.setLineWidth(0.4)
    c.line(LM, 1*cm, PAGE_W-RM, 1*cm)
    c.restoreState()

def cover_bg(c, doc):
    c.saveState()
    c.setFillColor(BG)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#1a1200"))
    c.circle(PAGE_W, PAGE_H, 120, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#221800"))
    c.circle(PAGE_W, PAGE_H, 70,  fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#1a1200"))
    c.circle(0, 0, 80, fill=1, stroke=0)
    c.restoreState()


# ── Build ─────────────────────────────────────────────────────────────────────
def build():
    out = "/home/user/Casaos/CasaOS_Guia_de_Usuario.pdf"
    doc = SimpleDocTemplate(
        out, pagesize=A4,
        leftMargin=LM, rightMargin=RM,
        topMargin=TM, bottomMargin=BM,
        title="CasaOS – Guía de Usuario",
        author="CasaOS",
    )
    s = []  # story

    # ══════════════════════════════════════════════════════════════════════════
    # COVER (half-page then content continues)
    # ══════════════════════════════════════════════════════════════════════════
    s += [
        sp(40),
        Paragraph("🏠 CasaOS", CT),
        sp(4),
        Paragraph("Guía de Usuario", CS),
        sp(6),
        Paragraph("Tu hogar digital, siempre en sincronía.", CG),
        sp(14),
    ]
    # Badge grid
    for row_data in [
        [("📋 Inicio",AMBER),("📅 Agenda",BLUE),("🍽 Recetas",GREEN)],
        [("🛒 Compras",ORANGE),("💰 Finanzas",PURPLE),("📁 Proyectos",PINK)],
    ]:
        cells = [Paragraph(lbl, BADGE) for lbl, _ in row_data]
        t = Table([cells], colWidths=[USABLE/3]*3)
        style = [
            ("ALIGN",         (0,0),(-1,-1),"CENTER"),
            ("VALIGN",        (0,0),(-1,-1),"MIDDLE"),
            ("TOPPADDING",    (0,0),(-1,-1),6),
            ("BOTTOMPADDING", (0,0),(-1,-1),6),
            ("INNERGRID",     (0,0),(-1,-1),3,BG),
            ("BOX",           (0,0),(-1,-1),0,colors.transparent),
        ]
        for i,(_, bg_c) in enumerate(row_data):
            style += [("BACKGROUND",(i,0),(i,0),bg_c),
                      ("TEXTCOLOR", (i,0),(i,0),BG)]
        t.setStyle(TableStyle(style))
        s.append(t)
        s.append(sp(3))
    s += [sp(10), Paragraph("Versión 1.0  ·  2025", CG), sp(16)]

    # ══════════════════════════════════════════════════════════════════════════
    # INTRO + TOC side by side
    # ══════════════════════════════════════════════════════════════════════════
    s += [hr(), Paragraph("¿Qué es CasaOS?", H1)]
    s.append(Paragraph(
        "CasaOS es la app todo-en-uno para parejas: tablero del hogar, calendario, recetas, "
        "compras, finanzas y proyectos — sincronizados en tiempo real entre ambos.",
        BODY,
    ))
    s += [sp(5)]

    # Modules as a compact 2-col table
    mod_rows = [
        [Paragraph("<b>🏠 Inicio</b>",   S("m",fontName="Helvetica-Bold",fontSize=8,textColor=AMBER,leading=11)),
         Paragraph("Tablero de notas y tareas del hogar.",BODYG),
         Paragraph("<b>📅 Agenda</b>",   S("m2",fontName="Helvetica-Bold",fontSize=8,textColor=BLUE,leading=11)),
         Paragraph("Calendario semanal y momentos en pareja.",BODYG)],
        [Paragraph("<b>🍽 Recetas</b>",  S("m3",fontName="Helvetica-Bold",fontSize=8,textColor=GREEN,leading=11)),
         Paragraph("Recetario con modo cocina e ingredientes.",BODYG),
         Paragraph("<b>🛒 Compras</b>",  S("m4",fontName="Helvetica-Bold",fontSize=8,textColor=ORANGE,leading=11)),
         Paragraph("Lista del súper categorizada y compartida.",BODYG)],
        [Paragraph("<b>💰 Finanzas</b>", S("m5",fontName="Helvetica-Bold",fontSize=8,textColor=PURPLE,leading=11)),
         Paragraph("Gastos, ingresos, metas de ahorro.",BODYG),
         Paragraph("<b>📁 Proyectos</b>",S("m6",fontName="Helvetica-Bold",fontSize=8,textColor=PINK,leading=11)),
         Paragraph("Metas del hogar con tareas y presupuesto.",BODYG)],
    ]
    CW4 = [2.4*cm, HALF-2.4*cm, 2.4*cm, HALF-2.4*cm]
    mt = Table(mod_rows, colWidths=CW4)
    mt.setStyle(TableStyle([
        ("ROWBACKGROUNDS",(0,0),(-1,-1),[CARD,CARD2]),
        ("VALIGN",        (0,0),(-1,-1),"MIDDLE"),
        ("TOPPADDING",    (0,0),(-1,-1),5),
        ("BOTTOMPADDING", (0,0),(-1,-1),5),
        ("LEFTPADDING",   (0,0),(-1,-1),7),
        ("LINEBELOW",     (0,0),(-1,-1),0.3,BG),
    ]))
    s.append(mt)

    # ══════════════════════════════════════════════════════════════════════════
    # GETTING STARTED
    # ══════════════════════════════════════════════════════════════════════════
    s += [sp(8), section_hdr("🚀","Primeros Pasos","Registro, inicio de sesión e invitación",AMBER), sp(5)]
    s += [
        step_box(1,"Crear cuenta","Registra tu correo y contraseña. Elige el nombre de tu hogar."),
        sp(3),
        step_box(2,"Unirte por invitación","Si tu pareja ya tiene CasaOS, pídele un enlace desde Ajustes → Invitar."),
        sp(3),
        step_box(3,"Iniciar sesión","Ingresa correo y contraseña. Activa 'Recordarme' para no volver a ingresar."),
        sp(5),
        box("Invitar a tu pareja",
            ["• Ve a Ajustes → 'Invitar a alguien a tu hogar'.",
             "• Ingresa el correo de tu pareja y envía la invitación.",
             "→ Solo puede haber una invitación activa a la vez."],
            AMBER, "📧"),
    ]

    # ══════════════════════════════════════════════════════════════════════════
    # NAVIGATION
    # ══════════════════════════════════════════════════════════════════════════
    s += [sp(8), section_hdr("🧭","Navegación","Barra inferior de seis secciones",AMBER), sp(5)]
    s += [nav_bar(), sp(5)]
    s.append(Paragraph(
        "Toca cualquier ícono para cambiar de sección. El botón <b>+</b> (esquina inferior derecha) "
        "abre el formulario de creación en cada sección.", BODY))

    # ══════════════════════════════════════════════════════════════════════════
    # INICIO
    # ══════════════════════════════════════════════════════════════════════════
    s += [sp(8), section_hdr("📋","Inicio","Tablero y Tareas del hogar",AMBER), sp(5)]
    s.append(box2(
        "Pestaña Tablero",
        ["• <b>Atención</b>: ítems urgentes (pagos, tareas atrasadas) — se llenan solos.",
         "• <b>Notas</b>: toca + → escribe → 'Agregar'. Papelera para eliminar.",
         "• <b>Fijados</b>: ítems de otras secciones con pin activo.",
         "→ Desfijar desde la sección de origen."],
        AMBER, "📋",
        "Pestaña Tareas",
        ["• Toca + → nombre → frecuencia → asignado → 'Agregar'.",
         "• Frecuencias: Diaria / Semanal / Quincenal / Mensual / Única vez.",
         "• Asignar a 'Yo' o al nombre de tu pareja.",
         "→ Tareas completadas van a 'Completadas hoy'."],
        GREEN, "✅",
    ))

    # ══════════════════════════════════════════════════════════════════════════
    # AGENDA
    # ══════════════════════════════════════════════════════════════════════════
    s += [sp(8), section_hdr("📅","Agenda","Calendario semanal y Momentos en pareja",BLUE), sp(5)]
    s.append(box2(
        "Calendario",
        ["• Navega semanas con ← →.",
         "• Toca un día para ver sus eventos.",
         "• Hoy aparece resaltado en ámbar.",
         "• Agregar evento: + → nombre → hora o 'Todo el día' → etiqueta → link opcional → 'Agregar'."],
        BLUE, "📅",
        "Momentos",
        ["• Actividades especiales en pareja.",
         "• + → qué quieren hacer → categoría → link / mapa.",
         "• Categorías: Cita / Viaje / Experiencia / En casa / Cultura / Gastro / Aventura.",
         "→ Dados 🎲 sugiere un momento al azar."],
        PURPLE, "💑",
    ))
    s += [sp(4),
          Paragraph("Etiquetas de eventos:", H3),
          pills([("Médico",BLUE),("Social",GREEN),("Pagos",RED),
                 ("Mantenimiento",ORANGE),("Momento",PURPLE)])]

    # ══════════════════════════════════════════════════════════════════════════
    # RECETAS
    # ══════════════════════════════════════════════════════════════════════════
    s += [sp(8), section_hdr("🍽","Recetas","Recetario digital con modo cocina",GREEN), sp(5)]
    s += [pills([("Todas",GRAY2),("Desayuno",ORANGE),("Comida",GREEN),
                 ("Cena",BLUE),("Snack",PURPLE),("Otro",GRAY)]), sp(4)]
    s.append(box2(
        "Agregar receta",
        ["• + → nombre → categoría.",
         "• Ingredientes: uno por línea.",
         "• Instrucciones: campo de texto libre.",
         "• 'Guardar' para finalizar."],
        GREEN, "📝",
        "Usar receta",
        ["• Toca la tarjeta para ver el detalle.",
         "• 'Modo cocina': marca ingredientes uno a uno.",
         "• 'A compras': envía todos los ingredientes a la lista de compras.",
         "→ Los ingredientes llegan como categoría 'Abarrotes'."],
        ORANGE, "👨‍🍳",
    ))

    # ══════════════════════════════════════════════════════════════════════════
    # COMPRAS
    # ══════════════════════════════════════════════════════════════════════════
    s += [sp(8), section_hdr("🛒","Compras","Lista del súper compartida en tiempo real",ORANGE), sp(5)]
    s.append(box2(
        "Agregar artículo",
        ["• + → escribe el artículo.",
         "• Selecciona categoría: Frutas y Verduras / Lácteos / Carnes / Panadería / Bebidas / Limpieza / Higiene / Abarrotes / Otros.",
         "• 'Agregar'."],
        ORANGE, "➕",
        "Marcar y limpiar",
        ["• Toca el círculo para tachar un artículo.",
         "• 'Limpiar (X)' en la cabecera elimina todos los marcados.",
         "• Editar: ícono de lápiz en el artículo.",
         "→ La limpieza no se puede deshacer."],
        RED, "✅",
    ))

    # ══════════════════════════════════════════════════════════════════════════
    # FINANZAS
    # ══════════════════════════════════════════════════════════════════════════
    s += [sp(8), section_hdr("💰","Finanzas","Control económico del hogar",PURPLE), sp(5)]
    s.append(box2(
        "Pestaña Hogar",
        ["• <b>Gastos fijos</b>: renta, servicios, streaming… con día de pago y responsable.",
         "• 'Por pagar' / 'Pagado': seguimiento del mes.",
         "• <b>Metas de ahorro</b>: nombre + monto objetivo + fecha.",
         "→ 'Abonar' registra depósitos; barra de progreso muestra el avance."],
        PURPLE, "🏠",
        "Pestaña Personal",
        ["• Balance del mes: ingresos − gastos = saldo.",
         "• Navega meses con ← →.",
         "• <b>Dividir gasto</b>: activa 'Dividir con {Pareja}' al agregar.",
         "→ 'Cuentas divididas' muestra quién le debe a quién; 'Saldar' para liquidar."],
        BLUE, "👤",
    ))
    s += [sp(4),
          box("Agregar movimiento  →  Pestaña Personal o Hogar  →  +  →  Nuevo movimiento",
              ["• Tipo: Gasto / Ingreso.   Alcance: Hogar / Personal.",
               "• Título + monto + categoría (Comida/Casa/Servicios/Entretenimiento/Salud/Transporte/Ropa/Otros).",
               "• Estado: Pendiente o Pagado.   Opción: Dividir con tu pareja.",
               "• Pestaña <b>Resumen</b>: tendencia 6 meses, desglose por categoría, compromisos y cuentas pendientes."],
              AMBER, "💸")]

    # ══════════════════════════════════════════════════════════════════════════
    # PROYECTOS
    # ══════════════════════════════════════════════════════════════════════════
    s += [sp(8), section_hdr("📁","Proyectos","Metas e iniciativas del hogar",PINK), sp(5)]
    s += [pills([("Planeando",AMBER),("En progreso",BLUE),("Terminado",GREEN)]), sp(4)]
    s.append(box2(
        "Crear proyecto",
        ["• + → nombre → estado → descripción opcional → presupuesto opcional → 'Guardar'.",
         "• Estados: Planeando → En progreso → Terminado.",
         "→ Fija proyectos al tablero con 'Agregar al tablero'."],
        PINK, "📝",
        "Tareas y presupuesto",
        ["• Abre el proyecto → sección 'Tareas' → nombre + costo opcional → 'Agregar tarea'.",
         "• Marca tareas con checkbox; progreso: X/Y tareas.",
         "• Vincula a una <b>Meta de ahorro</b> desde el detalle del proyecto.",
         "→ El presupuesto consumido = suma del costo de tareas."],
        GREEN, "✅",
    ))

    # ══════════════════════════════════════════════════════════════════════════
    # AJUSTES
    # ══════════════════════════════════════════════════════════════════════════
    s += [sp(8), section_hdr("⚙️","Ajustes","Perfil, hogar e invitaciones",GRAY), sp(5)]
    s.append(box(
        "Opciones disponibles",
        ["• Editar tu nombre de perfil y el nombre del hogar.",
         "• Ver los miembros del hogar (máximo 2: tú y tu pareja).",
         "• Invitar a alguien al hogar por correo electrónico.",
         "• Cerrar sesión de forma segura.",
         "→ El hogar es la unidad central; todos los datos le pertenecen."],
        GRAY, "⚙️",
    ))

    # ══════════════════════════════════════════════════════════════════════════
    # CONSEJOS
    # ══════════════════════════════════════════════════════════════════════════
    s += [sp(8), section_hdr("💡","Consejos y Trucos","Saca el máximo provecho",AMBER), sp(5)]
    tips = [
        ("Tablero como panel de control",
         "Fija los ítems más importantes de cada sección para tenerlos siempre visibles."),
        ("Gastos divididos",
         "Usa 'Dividir con {Pareja}' en cada gasto compartido; CasaOS lleva el saldo automáticamente."),
        ("Recetas → Compras",
         "Abre la receta y toca 'A compras' antes de ir al súper; los ingredientes se agregan solos."),
        ("Etiquetas en el calendario",
         "Las etiquetas (Médico, Pagos, Social…) ayudan a identificar compromisos de un vistazo."),
        ("Sección 'Atención'",
         "Revísala diariamente: ahí aparecen pagos próximos, tareas atrasadas y eventos del día."),
        ("Proyectos + Metas de ahorro",
         "Vincula cada proyecto a su meta de ahorro para ver progreso de ahorro y tareas en un solo lugar."),
    ]
    # Tips as a 2-column compact table
    tip_rows = []
    for i in range(0, len(tips), 2):
        left  = tips[i]
        right = tips[i+1] if i+1 < len(tips) else None
        def tip_cell(t):
            return [Paragraph(f"<b>{t[0]}</b>",
                              S("tt", fontName="Helvetica-Bold", fontSize=8,
                                textColor=AMBER, leading=11)),
                    Paragraph(t[1], S("td2", fontSize=7.5, textColor=GRAY, leading=10))]
        lc = tip_cell(left)
        rc = tip_cell(right) if right else ["", ""]
        t = Table([[lc, rc]], colWidths=[HALF, HALF])
        t.setStyle(TableStyle([
            ("BACKGROUND",    (0,0),(-1,-1), CARD),
            ("VALIGN",        (0,0),(-1,-1), "TOP"),
            ("TOPPADDING",    (0,0),(-1,-1), 6),
            ("BOTTOMPADDING", (0,0),(-1,-1), 6),
            ("LEFTPADDING",   (0,0),(-1,-1), 8),
            ("RIGHTPADDING",  (0,0),(-1,-1), 8),
            ("LINEAFTER",     (0,0),(0,-1),  4, BG),
            ("LINEBELOW",     (0,0),(-1,-1), 2, BG),
        ]))
        tip_rows.append(KeepTogether([t, sp(3)]))
    s += tip_rows

    s += [
        sp(10), hr(),
        Paragraph("¡Bienvenidos a CasaOS! 🏠", H1),
        Paragraph(
            "Esperamos que esta guía te ayude a organizar tu hogar y mantener a tu pareja "
            "siempre en sincronía. Versión 1.0 · 2025",
            CG,
        ),
    ]

    doc.build(s, onFirstPage=cover_bg, onLaterPages=bg)
    print(f"PDF generado: {out}")


if __name__ == "__main__":
    build()
