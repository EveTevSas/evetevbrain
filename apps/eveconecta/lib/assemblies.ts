import type {
  AssemblyCapability,
  AssemblyCapabilities,
  AssemblyDossier,
  AssemblyItem,
  AssemblySettings,
  AssemblyStage
} from "./contracts";

export const ASSEMBLY_STAGES: Array<{
  id: AssemblyStage;
  label: string;
  shortLabel: string;
  description: string;
}> = [
  {
    id: "preparation",
    label: "Preparación",
    shortLabel: "Preparación",
    description: "Reglas, orden del día, soportes y responsables."
  },
  {
    id: "convocation",
    label: "Convocatoria",
    shortLabel: "Convocatoria",
    description: "Envíos, entregas, recordatorios y segunda convocatoria."
  },
  {
    id: "registration",
    label: "Asistencia y poderes",
    shortLabel: "Acreditación",
    description: "Identidad, representación, poderes y quórum."
  },
  {
    id: "live",
    label: "Asamblea en vivo",
    shortLabel: "En vivo",
    description: "Quórum continuo, intervenciones y votaciones."
  },
  {
    id: "minutes",
    label: "Acta y cierre",
    shortLabel: "Acta",
    description: "Versiones, firmas, verificación y publicación."
  },
  {
    id: "follow_up",
    label: "Cumplimiento",
    shortLabel: "Seguimiento",
    description: "Responsables, fechas, presupuesto y evidencias."
  }
];

export const ASSEMBLY_CAPABILITY_DEFINITIONS: Array<{
  id: AssemblyCapability;
  label: string;
  description: string;
  stage: AssemblyStage;
}> = [
  {
    id: "document_repository",
    label: "Repositorio de soportes",
    description: "Informes, presupuesto, propuestas y anexos versionados.",
    stage: "preparation"
  },
  {
    id: "delivery_tracking",
    label: "Trazabilidad de convocatoria",
    description: "Evidencia de envío, entrega, apertura y recordatorios.",
    stage: "convocation"
  },
  {
    id: "proxy_management",
    label: "Gestión de poderes",
    description: "Validación, alcance, revocatoria y detección de duplicados.",
    stage: "registration"
  },
  {
    id: "identity_accreditation",
    label: "Acreditación de identidad",
    description: "Distingue propietario, apoderado, residente e invitado.",
    stage: "registration"
  },
  {
    id: "continuous_quorum",
    label: "Quórum continuo",
    description: "Seguimiento por unidades y coeficientes durante la sesión.",
    stage: "live"
  },
  {
    id: "unit_voting",
    label: "Votación por unidad",
    description: "Un voto por unidad para decisiones no económicas.",
    stage: "live"
  },
  {
    id: "coefficient_voting",
    label: "Votación por coeficiente",
    description: "Ponderación económica con denominador auditable.",
    stage: "live"
  },
  {
    id: "qualified_majorities",
    label: "Mayorías calificadas",
    description: "Reglas especiales y umbrales sobre el total de coeficientes.",
    stage: "live"
  },
  {
    id: "secret_ballots",
    label: "Votaciones secretas",
    description: "Elecciones con identidad validada y selección reservada.",
    stage: "live"
  },
  {
    id: "hybrid_participation",
    label: "Participación híbrida",
    description: "Asistentes presenciales y remotos en un mismo registro.",
    stage: "live"
  },
  {
    id: "resident_questions",
    label: "Preguntas y proposiciones",
    description: "Solicitudes de palabra, respuestas y constancias.",
    stage: "live"
  },
  {
    id: "minutes_workflow",
    label: "Flujo de acta",
    description: "Borrador, revisión, firmas, publicación y copias.",
    stage: "minutes"
  },
  {
    id: "decision_tracking",
    label: "Seguimiento de decisiones",
    description: "Responsables, vencimientos, presupuesto y evidencias.",
    stage: "follow_up"
  }
];

export const DEFAULT_ASSEMBLY_CAPABILITIES = Object.fromEntries(
  ASSEMBLY_CAPABILITY_DEFINITIONS.map(({ id }) => [id, true])
) as AssemblyCapabilities;

export function normalizeAssemblySettings(settings?: AssemblySettings): AssemblySettings {
  return {
    capabilities: {
      ...DEFAULT_ASSEMBLY_CAPABILITIES,
      ...(settings?.capabilities ?? {})
    },
    updatedAt: settings?.updatedAt
  };
}

function checklistFor(assembly: AssemblyItem): AssemblyDossier["checklist"] {
  const isClosed = assembly.status === "closed";
  const hasRepresentation = assembly.representedUnits > 0;
  return [
    {
      id: "rules-reviewed",
      stage: "preparation" as const,
      label: "Reglamento y matriz de mayorías revisados",
      completed: isClosed || hasRepresentation
    },
    {
      id: "agenda-approved",
      stage: "preparation" as const,
      label: "Orden del día y responsables confirmados",
      completed: true
    },
    {
      id: "documents-ready",
      stage: "preparation" as const,
      label: "Informes y soportes disponibles",
      completed: isClosed || hasRepresentation,
      capability: "document_repository" as const
    },
    {
      id: "convocation-sent",
      stage: "convocation" as const,
      label: "Convocatoria enviada a residentes registrados",
      completed: isClosed || hasRepresentation,
      capability: "delivery_tracking" as const
    },
    {
      id: "delivery-reviewed",
      stage: "convocation" as const,
      label: "Entregas fallidas y recordatorios revisados",
      completed: isClosed,
      capability: "delivery_tracking" as const
    },
    {
      id: "proxies-validated",
      stage: "registration" as const,
      label: "Poderes validados y sin duplicados",
      completed: isClosed || hasRepresentation,
      capability: "proxy_management" as const
    },
    {
      id: "attendees-accredited",
      stage: "registration" as const,
      label: "Asistentes acreditados por calidad y unidad",
      completed: isClosed || hasRepresentation,
      capability: "identity_accreditation" as const
    },
    {
      id: "quorum-verified",
      stage: "live" as const,
      label: "Quórum deliberatorio verificado",
      completed: isClosed || assembly.status === "in_progress",
      capability: "continuous_quorum" as const
    },
    {
      id: "votes-closed",
      stage: "live" as const,
      label: "Votaciones cerradas con denominador y regla",
      completed: isClosed
    },
    {
      id: "minutes-signed",
      stage: "minutes" as const,
      label: "Acta verificada y firmada",
      completed: isClosed,
      capability: "minutes_workflow" as const
    },
    {
      id: "minutes-published",
      stage: "minutes" as const,
      label: "Acta publicada y disponibilidad notificada",
      completed: isClosed,
      capability: "minutes_workflow" as const
    },
    {
      id: "decisions-assigned",
      stage: "follow_up" as const,
      label: "Decisiones asignadas con responsable y fecha",
      completed: isClosed,
      capability: "decision_tracking" as const
    }
  ];
}

function defaultAgendaItems(assembly: AssemblyItem): AssemblyDossier["agendaItems"] {
  const voted = assembly.status === "closed";
  if (assembly.type === "informative") {
    return [
      {
        id: "agenda-1",
        title: assembly.agenda ?? "Presentación y espacio de preguntas",
        decisionType: "informative",
        votingRule: "none",
        thresholdPercent: null,
        status: voted ? "voted" : "ready"
      }
    ];
  }
  return [
    {
      id: "agenda-1",
      title: "Verificación del quórum y aprobación del orden del día",
      decisionType: "non_economic",
      votingRule: "unit",
      thresholdPercent: 50,
      status: voted ? "voted" : "ready"
    },
    {
      id: "agenda-2",
      title:
        assembly.type === "ordinary"
          ? "Aprobación de estados financieros y presupuesto"
          : "Aprobación de la propuesta extraordinaria",
      decisionType: "economic",
      votingRule: "coefficient",
      thresholdPercent: 50,
      status: voted ? "voted" : "ready"
    },
    {
      id: "agenda-3",
      title:
        assembly.type === "ordinary"
          ? "Elección de órganos de administración"
          : "Autorización de ejecución y seguimiento",
      decisionType: "qualified",
      votingRule: "qualified_coefficient",
      thresholdPercent: 70,
      status: voted ? "voted" : "draft"
    }
  ];
}

function defaultVotes(assembly: AssemblyItem): AssemblyDossier["votes"] {
  const amount = Math.max(assembly.openVotes, assembly.status === "closed" ? 2 : 0);
  return Array.from({ length: amount }, (_, index) => ({
    id: `vote-${index + 1}`,
    title:
      index === 0
        ? "Aprobación de la propuesta principal"
        : index === 1
          ? "Elección de representantes"
          : `Proposición ${index + 1}`,
    rule:
      index === 0
        ? ("coefficient" as const)
        : index === 1
          ? ("unit" as const)
          : ("qualified_coefficient" as const),
    thresholdPercent: index === 2 ? 70 : 50,
    status: assembly.status === "closed" ? ("closed" as const) : ("open" as const),
    yesPercent: assembly.status === "closed" ? 72 : 0,
    noPercent: assembly.status === "closed" ? 21 : 0,
    abstentionPercent: assembly.status === "closed" ? 7 : 0
  }));
}

export function createAssemblyDossier(assembly: AssemblyItem): AssemblyDossier {
  const closed = assembly.status === "closed";
  const inProgress = assembly.status === "in_progress";
  const representedCoefficientPercent = Math.min(
    100,
    Math.max(0, assembly.quorumPercent + (assembly.quorumPercent > 0 ? 0.84 : 0))
  );
  const deliveryStarted = closed || inProgress || assembly.quorumPercent > 0;
  const sent = deliveryStarted ? assembly.totalUnits : 0;
  const delivered = closed
    ? assembly.totalUnits
    : deliveryStarted
      ? Math.min(assembly.totalUnits, Math.round(assembly.totalUnits * 0.94))
      : 0;
  return {
    currentStage: closed
      ? "follow_up"
      : inProgress
        ? "live"
        : assembly.quorumPercent > 0
          ? "registration"
          : "preparation",
    callType: "first",
    propertyUse: "residential",
    agendaLocked: assembly.type === "extraordinary",
    delivery: {
      sent,
      delivered,
      opened: closed ? assembly.totalUnits : Math.round(delivered * 0.82)
    },
    convocationRecipients: [],
    representedCoefficientPercent,
    validatedProxies: Math.max(0, Math.round(assembly.representedUnits * 0.12)),
    residentsWithoutVote: Math.max(0, Math.round(assembly.representedUnits * 0.04)),
    checklist: checklistFor(assembly),
    agendaItems: defaultAgendaItems(assembly),
    documents: [
      {
        id: "document-management",
        name: "Informe de gestión.pdf",
        category: "Informe de gestión",
        agendaItemId: "agenda-1",
        version: 1,
        status: closed || assembly.quorumPercent > 0 ? "published" : "ready",
        filePath: null,
        mimeType: null,
        sizeBytes: null,
        uploadedAt: null,
        uploadedBy: null
      },
      {
        id: "document-financial",
        name: "Estados financieros y presupuesto.pdf",
        category: "Estados financieros",
        agendaItemId: "agenda-2",
        version: 1,
        status: closed || assembly.quorumPercent > 0 ? "published" : "ready",
        filePath: null,
        mimeType: null,
        sizeBytes: null,
        uploadedAt: null,
        uploadedBy: null
      },
      {
        id: "document-proposals",
        name: "Propuestas y anexos.pdf",
        category: "Propuesta o anexo",
        agendaItemId: "agenda-3",
        version: 1,
        status: closed ? "published" : "pending",
        filePath: null,
        mimeType: null,
        sizeBytes: null,
        uploadedAt: null,
        uploadedBy: null
      }
    ],
    votes: defaultVotes(assembly),
    minutes: {
      version: closed ? 2 : 0,
      status: closed ? "published" : "not_started",
      signaturesCompleted: closed ? 2 : 0,
      signaturesRequired: 2,
      publishedAt: closed ? assembly.date : null
    },
    decisions: closed
      ? [
          {
            id: "decision-1",
            title: "Publicar el presupuesto aprobado",
            owner: "Administración",
            dueDate: assembly.date,
            status: "completed"
          },
          {
            id: "decision-2",
            title: "Formalizar los órganos elegidos",
            owner: "Secretaría de la asamblea",
            dueDate: assembly.date,
            status: "in_progress"
          },
          {
            id: "decision-3",
            title: "Presentar avance de compromisos",
            owner: "Consejo de administración",
            dueDate: assembly.date,
            status: "pending"
          }
        ]
      : []
  };
}

export function normalizeAssembly(
  assembly: AssemblyItem
): AssemblyItem & { dossier: AssemblyDossier } {
  const dossier = assembly.dossier ?? createAssemblyDossier(assembly);
  return {
    ...assembly,
    dossier: {
      ...dossier,
      convocationRecipients: dossier.convocationRecipients ?? [],
      checklist: (dossier.checklist ?? []).map((item) =>
        item.id === "convocation-sent"
          ? { ...item, label: "Convocatoria enviada a residentes registrados" }
          : item
      ),
      documents: (dossier.documents ?? []).map((document) => ({
        ...document,
        category: document.category ?? "Otro soporte",
        agendaItemId: document.agendaItemId ?? null,
        version: document.version ?? 1,
        filePath: document.filePath ?? null,
        mimeType: document.mimeType ?? null,
        sizeBytes: document.sizeBytes ?? null,
        uploadedAt: document.uploadedAt ?? null,
        uploadedBy: document.uploadedBy ?? null
      }))
    }
  };
}

export function enabledChecklist(
  dossier: AssemblyDossier,
  capabilities: AssemblyCapabilities
): AssemblyDossier["checklist"] {
  return dossier.checklist.filter((item) => !item.capability || capabilities[item.capability]);
}

export function assemblyReadinessPercent(
  dossier: AssemblyDossier,
  capabilities: AssemblyCapabilities
): number {
  const checklist = enabledChecklist(dossier, capabilities);
  if (!checklist.length) return 100;
  return Math.round((checklist.filter((item) => item.completed).length / checklist.length) * 100);
}

export function stageProgressPercent(
  dossier: AssemblyDossier,
  stage: AssemblyStage,
  capabilities: AssemblyCapabilities
): number {
  const checklist = enabledChecklist(dossier, capabilities).filter((item) => item.stage === stage);
  if (!checklist.length) return 100;
  return Math.round((checklist.filter((item) => item.completed).length / checklist.length) * 100);
}
