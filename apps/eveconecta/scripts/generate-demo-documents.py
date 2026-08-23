from __future__ import annotations

import shutil
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    KeepTogether,
    LongTable,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


REPO_ROOT = Path(__file__).resolve().parents[3]
OUTPUT_DIR = REPO_ROOT / "output" / "pdf"
PUBLIC_DIR = REPO_ROOT / "apps" / "eveconecta" / "public" / "demo" / "documentos"
LOGO = REPO_ROOT / "packages" / "brand" / "assets" / "favicon" / "apple-touch-icon.png"

NAVY = colors.HexColor("#0A2540")
BLUE = colors.HexColor("#1E6FEB")
MIXED_BLUE = colors.HexColor("#144A96")
CYAN = colors.HexColor("#22D3EE")
ICE = colors.HexColor("#EAF2FB")
TINT = colors.HexColor("#F4F9FD")
LINE = colors.HexColor("#D7E3F0")
SLATE = colors.HexColor("#64748B")
CORAL = colors.HexColor("#EE3D22")
WARNING = colors.HexColor("#D97706")
WHITE = colors.HexColor("#FDFEFF")


pdfmetrics.registerFont(TTFont("EveBody", "/System/Library/Fonts/Supplemental/Arial.ttf"))
pdfmetrics.registerFont(
    TTFont("EveBodyBold", "/System/Library/Fonts/Supplemental/Arial Bold.ttf")
)
pdfmetrics.registerFont(
    TTFont("EveHeading", "/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf")
)


styles = getSampleStyleSheet()
TITLE = ParagraphStyle(
    "EveTitle",
    fontName="EveHeading",
    fontSize=25,
    leading=29,
    textColor=NAVY,
    spaceAfter=8,
)
EYEBROW = ParagraphStyle(
    "EveEyebrow",
    fontName="EveBodyBold",
    fontSize=8.5,
    leading=11,
    textColor=BLUE,
    tracking=1.2,
    spaceAfter=8,
)
H1 = ParagraphStyle(
    "EveH1",
    fontName="EveHeading",
    fontSize=17,
    leading=21,
    textColor=NAVY,
    spaceBefore=4,
    spaceAfter=9,
)
H2 = ParagraphStyle(
    "EveH2",
    fontName="EveBodyBold",
    fontSize=11,
    leading=14,
    textColor=MIXED_BLUE,
    spaceBefore=9,
    spaceAfter=5,
)
BODY = ParagraphStyle(
    "EveBody",
    fontName="EveBody",
    fontSize=9.4,
    leading=14.2,
    textColor=NAVY,
    spaceAfter=7,
)
SMALL = ParagraphStyle(
    "EveSmall",
    fontName="EveBody",
    fontSize=7.8,
    leading=11,
    textColor=SLATE,
)
TABLE_HEAD = ParagraphStyle(
    "EveTableHead",
    fontName="EveBodyBold",
    fontSize=7.7,
    leading=10,
    textColor=WHITE,
)
TABLE_CELL = ParagraphStyle(
    "EveTableCell",
    fontName="EveBody",
    fontSize=7.6,
    leading=10.5,
    textColor=NAVY,
)


def header_footer(canvas, doc):
    width, height = A4
    canvas.saveState()
    canvas.setFillColor(WHITE)
    canvas.rect(0, 0, width, height, stroke=0, fill=1)
    canvas.setFillColor(NAVY)
    canvas.roundRect(18 * mm, height - 22 * mm, width - 36 * mm, 12 * mm, 4 * mm, 0, 1)
    if LOGO.exists():
        canvas.drawImage(str(LOGO), 23 * mm, height - 19.6 * mm, 7 * mm, 7 * mm, mask="auto")
    canvas.setFillColor(WHITE)
    canvas.setFont("EveHeading", 11)
    canvas.drawString(33 * mm, height - 17.3 * mm, "EveConecta")
    canvas.setFillColor(CYAN)
    canvas.setFont("EveBodyBold", 6.5)
    canvas.drawRightString(width - 23 * mm, height - 17.3 * mm, "CONJUNTO SENDEROS DEL PARQUE")

    canvas.setStrokeColor(LINE)
    canvas.line(18 * mm, 15 * mm, width - 18 * mm, 15 * mm)
    canvas.setFillColor(SLATE)
    canvas.setFont("EveBody", 7)
    canvas.drawString(18 * mm, 10 * mm, "Documento de demostración - Sin validez jurídica")
    canvas.drawRightString(width - 18 * mm, 10 * mm, f"Página {doc.page}")
    canvas.restoreState()


def metadata_table(document):
    data = [
        ["Categoría", document["category"], "Versión", document["version"]],
        ["Copropiedad", "Conjunto Senderos del Parque", "Actualizado", document["updated"]],
        ["Audiencia", document["audience"], "Clasificación", "Documento demo"],
    ]
    table = Table(data, colWidths=[24 * mm, 61 * mm, 25 * mm, 50 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), TINT),
                ("TEXTCOLOR", (0, 0), (-1, -1), NAVY),
                ("FONTNAME", (0, 0), (0, -1), "EveBodyBold"),
                ("FONTNAME", (2, 0), (2, -1), "EveBodyBold"),
                ("FONTNAME", (1, 0), (1, -1), "EveBody"),
                ("FONTNAME", (3, 0), (3, -1), "EveBody"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("LEADING", (0, 0), (-1, -1), 11),
                ("BOX", (0, 0), (-1, -1), 0.6, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, LINE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    return table


def demo_banner():
    text = Paragraph(
        "<b>DOCUMENTO DEMO</b><br/>Contenido ficticio creado exclusivamente para demostrar la biblioteca documental de EveConecta.",
        ParagraphStyle(
            "Banner",
            parent=BODY,
            fontSize=8.5,
            leading=12,
            textColor=WARNING,
            leftIndent=4,
            spaceAfter=0,
        ),
    )
    box = Table([[text]], colWidths=[160 * mm])
    box.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FFF7ED")),
                ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#FED7AA")),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return box


def content_table(headers, rows, widths=None):
    table_data = [
        [Paragraph(str(value), TABLE_HEAD) for value in headers],
        *[[Paragraph(str(value), TABLE_CELL) for value in row] for row in rows],
    ]
    if widths is None:
        widths = [160 * mm / len(headers)] * len(headers)
    table = LongTable(table_data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), MIXED_BLUE),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, TINT]),
                ("BOX", (0, 0), (-1, -1), 0.6, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.35, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return table


def section_story(section):
    story = [Paragraph(section["title"], H1)]
    for block in section.get("blocks", []):
        if isinstance(block, str):
            story.append(Paragraph(block, BODY))
        elif block[0] == "subheading":
            story.append(Paragraph(block[1], H2))
        elif block[0] == "bullets":
            for item in block[1]:
                story.append(Paragraph(f"- {item}", BODY))
        elif block[0] == "table":
            story.append(Spacer(1, 3 * mm))
            story.append(content_table(block[1], block[2], block[3] if len(block) > 3 else None))
            story.append(Spacer(1, 3 * mm))
    return story


def build_document(document):
    output = OUTPUT_DIR / document["filename"]
    doc = SimpleDocTemplate(
        str(output),
        pagesize=A4,
        rightMargin=25 * mm,
        leftMargin=25 * mm,
        topMargin=30 * mm,
        bottomMargin=22 * mm,
        title=document["title"],
        author="EveConecta - Evetev",
        subject="Documento de demostración",
    )
    story = [
        Spacer(1, 10 * mm),
        Paragraph(document["category"].upper(), EYEBROW),
        Paragraph(document["title"], TITLE),
        Paragraph(document["subtitle"], BODY),
        Spacer(1, 4 * mm),
        demo_banner(),
        Spacer(1, 6 * mm),
        metadata_table(document),
        Spacer(1, 8 * mm),
        Paragraph("Resumen", H1),
        Paragraph(document["summary"], BODY),
        Spacer(1, 5 * mm),
        Paragraph(
            "Este archivo forma parte del set comercial de EveConecta. Los nombres, cifras, identificadores y decisiones son simulados.",
            SMALL,
        ),
        PageBreak(),
    ]
    for index, section in enumerate(document["sections"]):
        story.extend(section_story(section))
        if index < len(document["sections"]) - 1:
            story.append(Spacer(1, 3 * mm))
    story.append(Spacer(1, 3 * mm))
    story.append(
        KeepTogether(
            [
                Paragraph("Control de versión", H2),
                content_table(
                    ["Versión", "Fecha", "Descripción"],
                    [[document["version"], document["updated"], "Versión vigente para demostración comercial"]],
                    [24 * mm, 35 * mm, 101 * mm],
                ),
            ]
        )
    )
    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    shutil.copy2(output, PUBLIC_DIR / document["filename"])


DOCUMENTS = [
    {
        "filename": "reglamento-propiedad-horizontal.pdf",
        "title": "Reglamento de propiedad horizontal",
        "subtitle": "Compendio operativo para la administración y el uso responsable de bienes privados y comunes.",
        "category": "Gobierno",
        "version": "4",
        "updated": "23 de julio de 2026",
        "audience": "Residentes",
        "summary": "Define la organización de la copropiedad, sus órganos de gobierno, las obligaciones económicas y las reglas generales para conservar la seguridad, convivencia y valor del conjunto.",
        "sections": [
            {
                "title": "1. Naturaleza y alcance",
                "blocks": [
                    "El Conjunto Senderos del Parque es una copropiedad residencial simulada con 168 unidades privadas. Este reglamento demo aplica a propietarios, residentes, visitantes, proveedores y personal contratado.",
                    ("subheading", "Principios de operación"),
                    ("bullets", ["Respeto por la destinación residencial de las unidades.", "Conservación de bienes comunes y protección de datos personales.", "Trazabilidad de decisiones, pagos, autorizaciones y comunicaciones."]),
                ],
            },
            {
                "title": "2. Órganos de administración",
                "blocks": [
                    ("table", ["Órgano", "Responsabilidad principal", "Periodicidad"], [["Asamblea general", "Aprueba presupuesto, reformas y decisiones de mayor impacto.", "Ordinaria anual y extraordinaria cuando proceda"], ["Consejo de administración", "Hace seguimiento a la ejecución y a los controles internos.", "Mensual"], ["Administración", "Ejecuta decisiones, gestiona proveedores y conserva evidencias.", "Permanente"]], [39 * mm, 82 * mm, 39 * mm]),
                ],
            },
            {
                "title": "3. Obligaciones económicas",
                "blocks": [
                    "Las cuotas ordinarias y extraordinarias se liquidan conforme al presupuesto aprobado y al coeficiente aplicable. Todo pago debe conservar referencia, fecha, valor, medio y aplicación contable.",
                    ("bullets", ["Vencimiento ordinario: día 10 de cada mes.", "Los intereses y ajustes requieren soporte verificable.", "La cartera individual solo es visible para las personas autorizadas."]),
                ],
            },
            {
                "title": "4. Bienes comunes y debido proceso",
                "blocks": [
                    "El uso de zonas comunes está sujeto a reserva, aforo, horarios y reglas de seguridad. Los presuntos incumplimientos deben notificarse, permitir descargos y quedar asociados a un expediente antes de cualquier decisión.",
                ],
            },
        ],
    },
    {
        "filename": "manual-convivencia-2026.pdf",
        "title": "Manual de convivencia 2026",
        "subtitle": "Acuerdos cotidianos para una comunidad tranquila, segura y conectada.",
        "category": "Convivencia",
        "version": "2",
        "updated": "24 de julio de 2026",
        "audience": "Residentes",
        "summary": "Reúne pautas prácticas para ruido, mascotas, movilidad, residuos, visitantes y solución temprana de conflictos dentro de la copropiedad.",
        "sections": [
            {
                "title": "1. Acuerdos esenciales",
                "blocks": [
                    ("bullets", ["Horario de descanso: 10:00 p. m. a 7:00 a. m.", "Los trabajos locativos deben anunciarse y respetar los horarios autorizados.", "Los residuos se entregan separados en los puntos y franjas definidos.", "Toda incidencia puede registrarse en EveConecta con evidencia y seguimiento de SLA."]),
                ],
            },
            {
                "title": "2. Mascotas y zonas comunes",
                "blocks": [
                    "Cada residente registra sus perros o gatos, mantiene actualizado su estado y responde por su manejo. En circulación se requiere acompañamiento responsable y recolección inmediata de residuos.",
                    ("table", ["Situación", "Conducta esperada"], [["Ascensores y pasillos", "Correa o transportador; prioridad para personas con movilidad reducida."], ["Zonas verdes", "Uso de áreas permitidas y recolección inmediata."], ["Novedad sanitaria", "Informar a la administración y actualizar el registro."]], [49 * mm, 111 * mm]),
                ],
            },
            {
                "title": "3. Vehículos, parqueaderos y visitantes",
                "blocks": [
                    ("bullets", ["Los vehículos permanentes deben estar registrados y vigentes.", "La velocidad máxima interna es de 10 km/h.", "Los parqueaderos de visitantes no pueden usarse como cupo permanente.", "Toda autorización de visitante debe indicar unidad y periodo de vigencia."]),
                ],
            },
            {
                "title": "4. Ruta de atención",
                "blocks": [
                    "La administración prioriza diálogo directo, mediación y registro objetivo. Cuando el caso requiera decisión formal, se informa la actuación, se reciben descargos y se conserva el resultado en el expediente.",
                ],
            },
        ],
    },
    {
        "filename": "poliza-areas-comunes.pdf",
        "title": "Póliza de áreas comunes",
        "subtitle": "Resumen de coberturas patrimoniales para activos y responsabilidades de la copropiedad.",
        "category": "Seguros",
        "version": "3",
        "updated": "25 de julio de 2026",
        "audience": "Consejo",
        "summary": "Ficha simulada de una póliza multirriesgo para áreas comunes. Los valores y la aseguradora son ficticios y no constituyen una oferta, certificado ni contrato de seguro.",
        "sections": [
            {
                "title": "1. Datos de la póliza demo",
                "blocks": [
                    ("table", ["Campo", "Detalle"], [["Aseguradora", "Aseguradora Solidaria Demo S.A."], ["Número", "EVT-AC-2026-00481"], ["Tomador", "Conjunto Senderos del Parque"], ["Vigencia", "1 de enero a 19 de septiembre de 2026"], ["Estado", "Por vencer - renovación en gestión"]], [48 * mm, 112 * mm]),
                ],
            },
            {
                "title": "2. Coberturas y límites",
                "blocks": [
                    ("table", ["Cobertura", "Límite demo", "Deducible demo"], [["Daño material en bienes comunes", "$ 4.500.000.000", "2% del evento"], ["Responsabilidad civil", "$ 1.200.000.000", "$ 2.000.000"], ["Equipo electrónico", "$ 380.000.000", "5% del evento"], ["Sustracción con violencia", "$ 150.000.000", "10% del evento"]], [72 * mm, 48 * mm, 40 * mm]),
                ],
            },
            {
                "title": "3. Exclusiones principales",
                "blocks": [("bullets", ["Daño por falta de mantenimiento conocido y no atendido.", "Actos intencionales o fraudulentos.", "Bienes privados que no formen parte de las áreas comunes.", "Eventos no reportados dentro del plazo contractual simulado."])],
            },
            {
                "title": "4. Ruta de reporte",
                "blocks": ["Registrar la incidencia, proteger el área, conservar fotografías y soportes, informar al corredor demo y documentar las decisiones de reparación o mitigación."],
            },
        ],
    },
    {
        "filename": "presupuesto-aprobado-2026.pdf",
        "title": "Presupuesto aprobado 2026",
        "subtitle": "Planeación anual de ingresos, gastos y reservas de la copropiedad.",
        "category": "Finanzas",
        "version": "1",
        "updated": "26 de julio de 2026",
        "audience": "Administración",
        "summary": "Presenta un presupuesto anual demo de $ 800.000.000, con distribución por rubro, metas de ejecución y criterios básicos de control y aprobación.",
        "sections": [
            {
                "title": "1. Resumen aprobado",
                "blocks": [
                    ("table", ["Rubro", "Presupuesto anual", "Ejecutado a julio", "Avance"], [["Servicios generales", "$ 159.000.000", "$ 124.000.000", "78%"], ["Mantenimiento", "$ 240.000.000", "$ 146.000.000", "61%"], ["Seguridad", "$ 200.000.000", "$ 96.000.000", "48%"], ["Seguros", "$ 101.000.000", "$ 54.000.000", "53%"], ["Imprevistos", "$ 100.000.000", "$ 18.000.000", "18%"], ["Total", "$ 800.000.000", "$ 438.000.000", "55%"]], [49 * mm, 42 * mm, 42 * mm, 27 * mm]),
                ],
            },
            {
                "title": "2. Fuentes de ingreso",
                "blocks": [
                    ("table", ["Fuente", "Valor anual demo"], [["Cuotas ordinarias", "$ 756.000.000"], ["Intereses y recuperaciones", "$ 18.000.000"], ["Reservas y otros ingresos", "$ 26.000.000"], ["Total", "$ 800.000.000"]], [100 * mm, 60 * mm]),
                ],
            },
            {
                "title": "3. Controles de ejecución",
                "blocks": [("bullets", ["Toda solicitud de gasto requiere rubro, proveedor, identificación y soporte.", "Los gastos sujetos a matriz de autoridad requieren dos aprobaciones.", "La aprobación no ejecuta el pago; tesorería conserva segregación de funciones.", "Las variaciones materiales se presentan al consejo con evidencia."])],
            },
            {
                "title": "4. Aprobación demo",
                "blocks": ["El presupuesto fue aprobado de manera ficticia por la Asamblea ordinaria 2026. Este PDF reemplaza el nombre de archivo XLSX mostrado anteriormente para que todo el set solicitado pueda descargarse en formato PDF."],
            },
        ],
    },
    {
        "filename": "acta-asamblea-ordinaria-2026.pdf",
        "title": "Acta de asamblea ordinaria 2026",
        "subtitle": "Registro demo de asistencia, deliberaciones, votaciones y decisiones.",
        "category": "Asambleas",
        "version": "1",
        "updated": "27 de julio de 2026",
        "audience": "Residentes",
        "summary": "Acta simulada de la asamblea ordinaria celebrada virtualmente el 20 de marzo de 2026, con representación de 131 de 168 unidades y quórum del 78%.",
        "sections": [
            {
                "title": "1. Instalación",
                "blocks": [
                    ("table", ["Dato", "Registro demo"], [["Fecha", "20 de marzo de 2026"], ["Hora", "7:00 p. m."], ["Modalidad", "Virtual"], ["Unidades representadas", "131 de 168"], ["Quórum", "78%"]], [58 * mm, 102 * mm]),
                    "Verificado el quórum, la presidencia declaró instalada la reunión y se aprobó el orden del día propuesto.",
                ],
            },
            {
                "title": "2. Decisiones",
                "blocks": [
                    ("table", ["Proposición", "A favor", "En contra", "Resultado"], [["Aprobación del informe de gestión", "118", "13", "Aprobada"], ["Aprobación del presupuesto 2026", "111", "20", "Aprobada"], ["Renovación de la póliza común", "124", "7", "Aprobada"], ["Programa de mantenimiento preventivo", "127", "4", "Aprobada"]], [76 * mm, 25 * mm, 25 * mm, 34 * mm]),
                ],
            },
            {
                "title": "3. Compromisos",
                "blocks": [("bullets", ["Publicar el presupuesto aprobado en la biblioteca documental.", "Presentar al consejo el cronograma de mantenimiento preventivo.", "Gestionar la renovación de la póliza antes de su vencimiento.", "Conservar votaciones, poderes y coeficientes en el expediente digital."])],
            },
            {
                "title": "4. Cierre",
                "blocks": ["Agotado el orden del día, la sesión demo finalizó a las 10:12 p. m. El contenido fue preparado únicamente para exhibir las capacidades documentales de EveConecta."],
            },
        ],
    },
]


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    for document in DOCUMENTS:
        build_document(document)
        print(document["filename"])


if __name__ == "__main__":
    main()
