import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
const demoAdminEmail = process.env.DEMO_ADMIN_EMAIL ?? "demo.comercial@evetev.com";
const demoAdminName = process.env.DEMO_ADMIN_NAME ?? "Equipo Comercial Evetev";
const demoAdminPassword = process.env.DEMO_ADMIN_PASSWORD;
const demoResidentPassword = process.env.DEMO_RESIDENT_PASSWORD;

if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error("Define SUPABASE_URL y SUPABASE_SECRET_KEY.");
}

const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});
const db = supabase.schema("conjuntos");

const conjuntos = [
  {
    digit: "1",
    id: "11111111-1111-4111-8111-111111111111",
    name: "Conjunto Senderos del Parque",
    nit: "900731245-1",
    city: "Bogotá",
    residentEmail: "demo.residente.senderos@evetev.com",
    units: 168,
    occupancy: 96,
    residents: [
      ["Laura Mendoza", "T1 · 301", "laura.mendoza", "+57 300 555 0131", 1, 1],
      ["Carlos Ramírez", "T2 · 504", "carlos.ramirez", "+57 301 555 0284", 2, 0],
      ["Diana Torres", "T3 · 202", "diana.torres", "+57 302 555 0396", 0, 2],
      ["Mateo Salazar", "T4 · 1102", "mateo.salazar", "+57 304 555 0448", 1, 1]
    ],
    amenities: ["Salón social Arrayán", "Cancha múltiple", "BBQ terraza"],
    assets: ["Ascensor Torre 2", "Bomba hidráulica", "CCTV acceso principal", "Planta eléctrica"]
  },
  {
    digit: "2",
    id: "22222222-2222-4222-8222-222222222222",
    name: "Unidad Mirador de los Alpes",
    nit: "901184632-2",
    city: "Medellín",
    residentEmail: "demo.residente.mirador@evetev.com",
    units: 124,
    occupancy: 94,
    residents: [
      ["Valentina Gómez", "Torre A · 804", "valentina.gomez", "+57 310 555 0185", 1, 0],
      ["Andrés Ospina", "Torre B · 305", "andres.ospina", "+57 311 555 0262", 1, 1],
      ["Mariana Vélez", "Torre C · 602", "mariana.velez", "+57 312 555 0347", 0, 1],
      ["Felipe Restrepo", "Torre D · 101", "felipe.restrepo", "+57 313 555 0491", 2, 1]
    ],
    amenities: ["Salón panorámico", "Piscina climatizada", "Zona BBQ Roble"],
    assets: ["Ascensor Torre B", "Caldera piscina", "Citofonía digital", "Puerta vehicular"]
  },
  {
    digit: "3",
    id: "33333333-3333-4333-8333-333333333333",
    name: "Conjunto Bahía Verde",
    nit: "901526807-3",
    city: "Cali",
    residentEmail: "demo.residente.bahia@evetev.com",
    units: 96,
    occupancy: 98,
    residents: [
      ["Sofía Castillo", "Bloque 1 · 403", "sofia.castillo", "+57 320 555 0143", 1, 2],
      ["Nicolás Herrera", "Bloque 2 · 207", "nicolas.herrera", "+57 321 555 0226", 1, 0],
      ["Paula Rincón", "Bloque 3 · 605", "paula.rincon", "+57 322 555 0379", 0, 1],
      ["Esteban Muñoz", "Bloque 4 · 102", "esteban.munoz", "+57 323 555 0455", 2, 0]
    ],
    amenities: ["Kiosco Guayacán", "Cancha de pádel", "Terraza comunitaria"],
    assets: ["Bomba piscina", "Subestación eléctrica", "Cámaras perimetrales", "Portón peatonal"]
  }
];

function stableId(digit, group, index) {
  const groupPart = group.toString(16).padStart(4, "0");
  const indexPart = index.toString(16).padStart(3, "0");
  const tail = `${digit.repeat(8)}${index.toString(16).padStart(4, "0")}`;
  return `${digit.repeat(8)}-${groupPart}-4${indexPart}-8${indexPart}-${tail}`;
}

function iso(day, hour = "09:00:00") {
  return `2026-07-${String(day).padStart(2, "0")}T${hour}-05:00`;
}

const demoIdentificationTypes = ["cc", "cc", "ti", "ce"];

function demoIdentificationNumber(digit, index) {
  return `${digit}0${String(index + 1).padStart(7, "0")}`;
}

function parkingDemoFor(conjunto) {
  const { digit, residents } = conjunto;
  const definitions = [
    [`L${digit}-5`, "zone", `L${digit}`, "5", null, 0],
    ["M2-3", "zone", "M2", "3", null, 1],
    ["A1", "zone", "A", "1", null, null],
    ["C18-1", "unit", null, "1", residents[3][1], 3]
  ];
  return definitions.map(([code, kind, sector, number, linkedUnit, vehicleIndex], index) => ({
    id: stableId(digit, 9, index + 1),
    code,
    kind,
    sector,
    number,
    linkedUnit,
    assignedUnit: vehicleIndex === null ? null : residents[vehicleIndex][1],
    assignedVehicleId: vehicleIndex === null ? null : stableId(digit, 10, Number(vehicleIndex) + 1),
    status: vehicleIndex === null ? "available" : "assigned"
  }));
}

function vehicleDemoFor(conjunto, parkingSpots) {
  const { digit, residents } = conjunto;
  const prefixes = ["EVT", "MIR", "BHV"];
  return residents.map(([name, unit], index) => {
    const parkingSpot = parkingSpots.find(
      (candidate) => candidate.assignedVehicleId === stableId(digit, 10, index + 1)
    );
    return {
      id: stableId(digit, 10, index + 1),
      plate: `${prefixes[Number(digit) - 1]}${digit}${String(index + 1).padStart(2, "0")}`,
      kind: index === 2 ? "motorcycle" : "car",
      brand: ["Renault", "Mazda", "Yamaha", "Chevrolet"][index],
      color: ["Gris", "Azul", "Negro", "Blanco"][index],
      personId: stableId(digit, 2, index + 1),
      resident: name,
      unit,
      parkingSpotId: parkingSpot?.id ?? null,
      parkingCode: parkingSpot?.code ?? null,
      accessStatus: index === 2 ? "suspended" : "authorized",
      validFrom: iso(1, "00:00:00"),
      validUntil: null
    };
  });
}

function petDemoFor(conjunto) {
  const { digit, residents } = conjunto;
  const definitions = [
    [0, "dog", 2021, "medium", "Milo", "active"],
    [2, "cat", 2020, "small", "Luna", "active"],
    [2, "cat", 2023, "small", "Simba", "active"],
    [3, "dog", 2019, "large", "Bruno", "active"],
    [3, "cat", 2015, "small", "Nala", "inactive"]
  ];
  return definitions.map(([personIndex, type, birthYear, size, name, status], index) => ({
    id: stableId(digit, 13, index + 1),
    personId: stableId(digit, 2, Number(personIndex) + 1),
    resident: residents[personIndex][0],
    unit: residents[personIndex][1],
    type,
    birthYear,
    size,
    name,
    status,
    photoPath: null,
    createdAt: iso(12 + index, "10:00:00")
  }));
}

function snapshotFor(conjunto) {
  const { digit, residents } = conjunto;
  const amount = 48500000 + Number(digit) * 1500000;
  const parkingSpots = parkingDemoFor(conjunto);
  const vehicles = vehicleDemoFor(conjunto, parkingSpots);
  const pets = petDemoFor(conjunto);
  const people = residents.map(([name, unit, email, phone], index) => ({
    id: stableId(digit, 2, index + 1),
    name,
    identificationType: demoIdentificationTypes[index],
    identificationNumber: demoIdentificationNumber(digit, index),
    unit,
    kind: index === 2 ? "tenant" : index === 3 ? "resident" : "owner",
    contact: `${email}@demo.evetev.invalid · ${phone}`,
    email: `${email}@demo.evetev.invalid`,
    phone,
    vehicles: 1,
    pets: pets.filter(
      (pet) => pet.personId === stableId(digit, 2, index + 1) && pet.status === "active"
    ).length,
    status: index === 3 ? "invited" : "active"
  }));
  const fees = residents.map(([name, unit], index) => ({
    id: stableId(digit, 21, index + 1),
    unit,
    resident: name,
    concept: "Administración julio 2026",
    dueDate: "2026-07-10",
    amountMinor: amount + index * 250000,
    balanceMinor: index === 1 ? 0 : index === 3 ? amount + index * 250000 : amount,
    status: index === 1 ? "paid" : index === 3 ? "overdue" : "pending"
  }));
  fees.push({
    id: stableId(digit, 21, 5),
    unit: residents[1][1],
    resident: residents[1][0],
    concept: "Cuota extraordinaria impermeabilización",
    dueDate: "2026-08-05",
    amountMinor: 18000000,
    balanceMinor: 18000000,
    status: "pending"
  });

  return {
    tenant: {
      id: conjunto.id,
      name: conjunto.name,
      nit: conjunto.nit,
      city: conjunto.city,
      units: conjunto.units,
      occupancyPercent: conjunto.occupancy
    },
    currentUser: {
      id: stableId(digit, 99, 1),
      name: demoAdminName,
      role: "Administración",
      initials: "EC"
    },
    metrics: [
      {
        label: "Recaudo del mes",
        value: `$${72 + Number(digit) * 6},4 M`,
        detail: `${94 + Number(digit)}% de la meta`,
        trend: "up"
      },
      {
        label: "Cartera vencida",
        value: `$${8 + Number(digit)},8 M`,
        detail: `${4 + Number(digit)} unidades`,
        trend: "down"
      },
      {
        label: "Ocupación",
        value: `${conjunto.occupancy}%`,
        detail: `${conjunto.units} unidades`,
        trend: "neutral"
      },
      {
        label: "Casos dentro de SLA",
        value: `${90 + Number(digit)}%`,
        detail: "Meta mensual 95%",
        trend: "up"
      }
    ],
    portfolio: [
      { month: "Ene", collected: 64, billed: 69 },
      { month: "Feb", collected: 67, billed: 70 },
      { month: "Mar", collected: 69, billed: 72 },
      { month: "Abr", collected: 70, billed: 73 },
      { month: "May", collected: 72, billed: 75 },
      { month: "Jun", collected: 75, billed: 77 },
      { month: "Jul", collected: 78 + Number(digit) * 2, billed: 81 + Number(digit) * 2 }
    ],
    fees,
    people,
    pets,
    cases: [
      {
        id: stableId(digit, 22, 1),
        code: `PQRS-2026-${digit}01`,
        title: "Ruido recurrente en horario nocturno",
        category: "Convivencia",
        requester: residents[0][0],
        unit: residents[0][1],
        priority: "high",
        status: "in_progress",
        slaHours: 8,
        elapsedHours: 5,
        createdAt: iso(27, "20:15:00")
      },
      {
        id: stableId(digit, 22, 2),
        code: `PQRS-2026-${digit}02`,
        title: "Revisión de humedad en zona común",
        category: "Mantenimiento",
        requester: residents[1][0],
        unit: residents[1][1],
        priority: "medium",
        status: "open",
        slaHours: 24,
        elapsedHours: 7,
        createdAt: iso(28, "08:20:00")
      },
      {
        id: stableId(digit, 22, 3),
        code: `PQRS-2026-${digit}03`,
        title: "Actualización de datos de contacto",
        category: "Administración",
        requester: residents[2][0],
        unit: residents[2][1],
        priority: "low",
        status: "resolved",
        slaHours: 48,
        elapsedHours: 4,
        createdAt: iso(25, "10:10:00")
      },
      {
        id: stableId(digit, 22, 4),
        code: `PQRS-2026-${digit}04`,
        title: "Validación de cobro de parqueadero",
        category: "Facturación",
        requester: residents[3][0],
        unit: residents[3][1],
        priority: "medium",
        status: "open",
        slaHours: 24,
        elapsedHours: 2,
        createdAt: iso(28, "11:45:00")
      }
    ],
    reservations: [
      {
        id: stableId(digit, 23, 1),
        amenity: conjunto.amenities[0],
        date: "2026-07-30",
        time: "18:00",
        resident: residents[0][0],
        unit: residents[0][1],
        amountMinor: 18000000,
        status: "confirmed"
      },
      {
        id: stableId(digit, 23, 2),
        amenity: conjunto.amenities[1],
        date: "2026-07-31",
        time: "07:00",
        resident: residents[1][0],
        unit: residents[1][1],
        amountMinor: 0,
        status: "confirmed"
      },
      {
        id: stableId(digit, 23, 3),
        amenity: conjunto.amenities[2],
        date: "2026-08-02",
        time: "12:00",
        resident: residents[2][0],
        unit: residents[2][1],
        amountMinor: 12000000,
        status: "pending"
      },
      {
        id: stableId(digit, 23, 4),
        amenity: conjunto.amenities[0],
        date: "2026-07-25",
        time: "15:00",
        resident: residents[3][0],
        unit: residents[3][1],
        amountMinor: 18000000,
        status: "cancelled"
      }
    ],
    visitors: [
      {
        id: stableId(digit, 24, 1),
        name: "Alejandra Rojas",
        documentSuffix: "4821",
        unit: residents[0][1],
        vehiclePlate: "KLM248",
        validFrom: iso(28, "14:00:00"),
        validUntil: iso(28, "20:00:00"),
        status: "expected",
        accessCode: `41${digit}826`,
        offlineCreated: false
      },
      {
        id: stableId(digit, 24, 2),
        name: "Mensajería Coordinadora",
        documentSuffix: "7712",
        unit: residents[1][1],
        vehiclePlate: null,
        validFrom: iso(28, "09:00:00"),
        validUntil: iso(28, "17:00:00"),
        status: "inside",
        accessCode: `52${digit}914`,
        offlineCreated: true
      },
      {
        id: stableId(digit, 24, 3),
        name: "Julián Pardo",
        documentSuffix: "1305",
        unit: residents[2][1],
        vehiclePlate: "NQX703",
        validFrom: iso(28, "08:00:00"),
        validUntil: iso(28, "12:00:00"),
        status: "departed",
        accessCode: `63${digit}472`,
        offlineCreated: false
      },
      {
        id: stableId(digit, 24, 4),
        name: "Servicio técnico autorizado",
        documentSuffix: "9054",
        unit: "Administración",
        vehiclePlate: "TSP119",
        validFrom: iso(29, "07:00:00"),
        validUntil: iso(29, "16:00:00"),
        status: "expected",
        accessCode: `74${digit}305`,
        offlineCreated: false
      }
    ],
    parkingSpots,
    vehicles,
    vehicleAccessEvents: [
      {
        id: stableId(digit, 11, 1),
        plate: vehicles[0].plate,
        direction: "entry",
        decision: "authorized",
        reason: "registered_vehicle",
        source: "permanent",
        unit: vehicles[0].unit,
        parkingCode: vehicles[0].parkingCode,
        occurredAt: iso(28, "07:35:00")
      },
      {
        id: stableId(digit, 11, 2),
        plate: vehicles[2].plate,
        direction: "entry",
        decision: "denied",
        reason: "suspended_vehicle",
        source: "permanent",
        unit: vehicles[2].unit,
        parkingCode: null,
        occurredAt: iso(28, "08:12:00")
      },
      {
        id: stableId(digit, 11, 3),
        plate: `XYZ${digit}9`,
        direction: "entry",
        decision: "denied",
        reason: "unknown_vehicle",
        source: "unknown",
        unit: null,
        parkingCode: null,
        occurredAt: iso(28, "09:04:00")
      }
    ],
    workOrders: conjunto.assets.map((asset, index) => ({
      id: stableId(digit, 25, index + 1),
      code: `OT-2026-${digit}0${index + 1}`,
      asset,
      title: [
        "Mantenimiento preventivo trimestral",
        "Cambio de sello y revisión de presión",
        "Ajuste de grabación y almacenamiento",
        "Prueba operativa y nivel de combustible"
      ][index],
      provider: ["Tecnielevadores SAS", "Hidrosistemas Ltda.", "Seguridad 360", "Energía Continua"][
        index
      ],
      scheduledDate: `2026-0${index < 2 ? 7 : 8}-${28 + index}`,
      estimatedMinor: [185000000, 74000000, 96000000, 125000000][index],
      status: ["in_progress", "planned", "completed", "overdue"][index],
      priority: ["critical", "important", "routine", "important"][index]
    })),
    expenses: [
      {
        id: stableId(digit, 26, 1),
        concept: "Reparación urgente de motobomba",
        provider: "Hidrosistemas Ltda.",
        providerIdentification: "900.000.101-1",
        budgetLine: "Mantenimiento",
        amountMinor: 485000000,
        requestedBy: "Administración",
        approvals: 1,
        approvalsRequired: 2,
        status: "pending_approval",
        createdAt: iso(27, "16:30:00")
      },
      {
        id: stableId(digit, 26, 2),
        concept: "Renovación póliza áreas comunes",
        provider: "Aseguradora Solidaria",
        providerIdentification: "900.000.102-2",
        budgetLine: "Seguros",
        amountMinor: 1280000000,
        requestedBy: "Consejo",
        approvals: 2,
        approvalsRequired: 2,
        status: "approved",
        createdAt: iso(24, "09:00:00")
      },
      {
        id: stableId(digit, 26, 3),
        concept: "Insumos de aseo julio",
        provider: "Suministros Verdes",
        providerIdentification: "900.000.103-3",
        budgetLine: "Servicios generales",
        amountMinor: 235000000,
        requestedBy: "Administración",
        approvals: 2,
        approvalsRequired: 2,
        status: "paid",
        createdAt: iso(20, "13:15:00")
      },
      {
        id: stableId(digit, 26, 4),
        concept: "Iluminación LED zonas peatonales",
        provider: "Lumen Colombia",
        providerIdentification: "900.000.104-4",
        budgetLine: "Mejoras",
        amountMinor: 690000000,
        requestedBy: "Comité ambiental",
        approvals: 0,
        approvalsRequired: 2,
        status: "draft",
        createdAt: iso(28, "10:05:00")
      }
    ],
    announcements: [
      {
        id: stableId(digit, 27, 1),
        title: "Mantenimiento programado de red hidráulica",
        message:
          "El servicio de agua tendrá una interrupción programada mientras se realiza mantenimiento preventivo a la red hidráulica.",
        audience: "Todos los residentes",
        channel: "App + correo + WhatsApp",
        publishedAt: iso(28, "07:30:00"),
        deliveryRate: 97,
        status: "published"
      },
      {
        id: stableId(digit, 27, 2),
        title: "Convocatoria asamblea extraordinaria",
        message:
          "Invitamos a los propietarios a consultar el orden del día y participar en la asamblea extraordinaria de la copropiedad.",
        audience: "Propietarios",
        channel: "App + correo certificado",
        publishedAt: iso(29, "08:00:00"),
        deliveryRate: 0,
        status: "scheduled"
      },
      {
        id: stableId(digit, 27, 3),
        title: "Jornada de vacunación de mascotas",
        message:
          "Registra previamente a tu mascota para participar en la jornada de vacunación organizada en la zona social.",
        audience: "Residentes con mascotas",
        channel: "App",
        publishedAt: iso(25, "11:00:00"),
        deliveryRate: 94,
        status: "published"
      },
      {
        id: stableId(digit, 27, 4),
        title: "Encuesta de satisfacción de portería",
        message:
          "Cuéntanos cómo ha sido tu experiencia con el servicio de portería y ayúdanos a priorizar mejoras.",
        audience: "Todos los residentes",
        channel: "App",
        publishedAt: iso(30, "10:00:00"),
        deliveryRate: 0,
        status: "draft"
      }
    ],
    assemblySettings: {
      capabilities: {
        document_repository: true,
        delivery_tracking: true,
        proxy_management: true,
        identity_accreditation: true,
        continuous_quorum: true,
        unit_voting: true,
        coefficient_voting: true,
        qualified_majorities: true,
        secret_ballots: true,
        hybrid_participation: true,
        resident_questions: true,
        minutes_workflow: true,
        decision_tracking: true
      }
    },
    assemblies: [
      {
        id: stableId(digit, 28, 1),
        title: "Asamblea extraordinaria de presupuesto",
        date: "2026-08-12",
        mode: "Híbrida",
        type: "extraordinary",
        location: "Salón social y videoconferencia",
        agenda: "Verificación del quórum, presentación del presupuesto y votación de la propuesta.",
        quorumPercent: 62,
        representedUnits: Math.round(conjunto.units * 0.62),
        totalUnits: conjunto.units,
        status: "scheduled",
        openVotes: 3
      },
      {
        id: stableId(digit, 28, 2),
        title: "Asamblea ordinaria 2026",
        date: "2026-03-21",
        mode: "Virtual",
        type: "ordinary",
        location: "https://asambleas.demo.evetev.invalid/ordinaria-2026",
        agenda: "Informe de gestión, estados financieros, elección de órganos y proposiciones.",
        quorumPercent: 78,
        representedUnits: Math.round(conjunto.units * 0.78),
        totalUnits: conjunto.units,
        status: "closed",
        openVotes: 0
      },
      {
        id: stableId(digit, 28, 3),
        title: "Reunión informativa de seguridad",
        date: "2026-07-30",
        mode: "Presencial",
        type: "informative",
        location: "Salón social principal",
        agenda: "Presentación del plan de seguridad y espacio de preguntas de la comunidad.",
        quorumPercent: 35,
        representedUnits: Math.round(conjunto.units * 0.35),
        totalUnits: conjunto.units,
        status: "scheduled",
        openVotes: 1
      }
    ],
    documents: [
      [
        "Reglamento de propiedad horizontal.pdf",
        "Gobierno",
        4,
        "residents",
        "current",
        "/demo/documentos/reglamento-propiedad-horizontal.pdf"
      ],
      [
        "Manual de convivencia 2026.pdf",
        "Convivencia",
        2,
        "residents",
        "current",
        "/demo/documentos/manual-convivencia-2026.pdf"
      ],
      [
        "Póliza de áreas comunes.pdf",
        "Seguros",
        3,
        "council",
        "expiring",
        "/demo/documentos/poliza-areas-comunes.pdf"
      ],
      [
        "Presupuesto aprobado 2026.pdf",
        "Finanzas",
        1,
        "administration",
        "current",
        "/demo/documentos/presupuesto-aprobado-2026.pdf"
      ],
      [
        "Acta asamblea ordinaria 2026.pdf",
        "Asambleas",
        1,
        "residents",
        "current",
        "/demo/documentos/acta-asamblea-ordinaria-2026.pdf"
      ]
    ].map(([name, category, version, visibility, status, downloadPath], index) => ({
      id: stableId(digit, 29, index + 1),
      name,
      category,
      version,
      updatedAt: iso(23 + index, "12:00:00"),
      visibility,
      status,
      downloadPath
    })),
    audit: [
      ["auth.inicio_sesion", "Sesión", "Inicio de sesión con MFA validado"],
      ["finanzas.cuotas_generadas", "Cuotas julio", `${conjunto.units} obligaciones creadas`],
      ["finanzas.pago_aplicado", residents[0][1], "Pago confirmado y aplicado por EvePay"],
      ["porteria.visitante_autorizado", residents[1][1], "Autorización sincronizada con portería"],
      ["pqrs.caso_asignado", `PQRS-2026-${digit}01`, "Caso asignado a convivencia"],
      ["documentos.version_publicada", "Manual de convivencia", "Versión 2 publicada"],
      ["presupuesto.gasto_aprobado", "Mantenimiento", "Primera aprobación registrada"],
      ["reservas.reserva_confirmada", conjunto.amenities[0], "Disponibilidad y depósito validados"],
      ["mantenimiento.orden_actualizada", `OT-2026-${digit}01`, "Proveedor inició la orden"],
      ["comunicaciones.envio_completado", "Aviso hidráulico", "Entrega multicanal completada"]
    ].map(([action, resource, detail], index) => ({
      id: stableId(digit, 30, index + 1),
      occurredAt: iso(
        28 - Math.floor(index / 3),
        `${String(15 - (index % 3) * 2).padStart(2, "0")}:00:00`
      ),
      actor: index === 0 ? demoAdminName : index % 2 ? "Motor EveConecta" : "Administración",
      action,
      resource,
      detail,
      result: "success"
    }))
  };
}

async function upsert(table, rows, options = { onConflict: "id" }) {
  const { error } = await db.from(table).upsert(rows, options);
  if (error) throw new Error(`${table}: ${error.message}`);
}

async function ensureDemoAdmin() {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  let user = data.users.find(
    (candidate) => candidate.email?.toLowerCase() === demoAdminEmail.toLowerCase()
  );

  if (!user) {
    if (!demoAdminPassword) {
      throw new Error("DEMO_ADMIN_PASSWORD es obligatorio al crear el usuario comercial.");
    }
    const created = await supabase.auth.admin.createUser({
      email: demoAdminEmail,
      password: demoAdminPassword,
      email_confirm: true,
      user_metadata: { full_name: demoAdminName, purpose: "commercial_demo" }
    });
    if (created.error) throw created.error;
    user = created.data.user;
  } else {
    const attributes = {
      email_confirm: true,
      user_metadata: { ...user.user_metadata, full_name: demoAdminName, purpose: "commercial_demo" }
    };
    if (demoAdminPassword) attributes.password = demoAdminPassword;
    const updated = await supabase.auth.admin.updateUserById(user.id, attributes);
    if (updated.error) throw updated.error;
    user = updated.data.user;
  }
  return user;
}

async function ensureDemoResidents() {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;

  const accounts = new Map();
  for (const conjunto of conjuntos) {
    const [name, unit] = conjunto.residents[0];
    let user = data.users.find(
      (candidate) => candidate.email?.toLowerCase() === conjunto.residentEmail.toLowerCase()
    );
    const metadata = {
      full_name: name,
      purpose: "commercial_resident_demo",
      eveconecta_conjunto_id: conjunto.id,
      eveconecta_resident_name: name,
      eveconecta_unit: unit
    };

    if (!user) {
      if (!demoResidentPassword) {
        throw new Error(
          `DEMO_RESIDENT_PASSWORD es obligatorio al crear ${conjunto.residentEmail}.`
        );
      }
      const created = await supabase.auth.admin.createUser({
        email: conjunto.residentEmail,
        password: demoResidentPassword,
        email_confirm: true,
        user_metadata: metadata
      });
      if (created.error) throw created.error;
      user = created.data.user;
    } else {
      const attributes = {
        email_confirm: true,
        user_metadata: { ...user.user_metadata, ...metadata }
      };
      if (demoResidentPassword) attributes.password = demoResidentPassword;
      const updated = await supabase.auth.admin.updateUserById(user.id, attributes);
      if (updated.error) throw updated.error;
      user = updated.data.user;
    }
    accounts.set(conjunto.id, user);
  }
  return accounts;
}

async function main() {
  const admin = await ensureDemoAdmin();
  const residentAccounts = await ensureDemoResidents();

  await upsert(
    "conjuntos",
    conjuntos.map((item) => ({
      id: item.id,
      nombre: item.name,
      nit: item.nit,
      ciudad: item.city,
      activo: true
    }))
  );
  await upsert(
    "miembros_conjunto",
    conjuntos.flatMap((item) => [
      {
        conjunto_id: item.id,
        usuario_id: admin.id,
        rol: "super_admin",
        activo: true
      },
      {
        conjunto_id: item.id,
        usuario_id: residentAccounts.get(item.id).id,
        rol: "residente",
        activo: true
      }
    ]),
    { onConflict: "conjunto_id,usuario_id" }
  );

  for (const conjunto of conjuntos) {
    const demoSnapshot = snapshotFor(conjunto);
    const units = conjunto.residents.map((resident, index) => ({
      id: stableId(conjunto.digit, 1, index + 1),
      conjunto_id: conjunto.id,
      codigo: resident[1],
      tipo: "apartamento",
      coeficiente: 25,
      activa: true
    }));
    const people = conjunto.residents.map((resident, index) => {
      const residentAccount = residentAccounts.get(conjunto.id);
      return {
        id: stableId(conjunto.digit, 2, index + 1),
        conjunto_id: conjunto.id,
        auth_usuario_id: index === 0 ? residentAccount.id : null,
        nombre: resident[0],
        tipo_identificacion: demoIdentificationTypes[index],
        numero_identificacion: demoIdentificationNumber(conjunto.digit, index),
        email: index === 0 ? residentAccount.email : `${resident[2]}@demo.evetev.invalid`,
        telefono: resident[3],
        autorizacion_tratamiento_en: iso(10 + index, "09:00:00"),
        finalidad_autorizada: "Operación y comunicaciones de la copropiedad"
      };
    });
    const links = conjunto.residents.map((_resident, index) => ({
      id: stableId(conjunto.digit, 3, index + 1),
      conjunto_id: conjunto.id,
      persona_id: people[index].id,
      unidad_id: units[index].id,
      relacion: index === 2 ? "residente" : "propietario",
      responsable_pago: index !== 2,
      vigente_desde: "2026-01-01"
    }));
    const petSnapshot = petDemoFor(conjunto);
    const petRows = petSnapshot.map((pet) => ({
      id: pet.id,
      conjunto_id: conjunto.id,
      persona_id: pet.personId,
      unidad_id: units.find((unit) => unit.codigo === pet.unit)?.id,
      tipo: pet.type === "dog" ? "perro" : "gato",
      anio_nacimiento: pet.birthYear,
      tamano: pet.size === "large" ? "grande" : pet.size === "medium" ? "mediano" : "pequeno",
      nombre: pet.name,
      estado: pet.status === "active" ? "activo" : "inactivo",
      foto_path: pet.photoPath,
      creado_en: pet.createdAt
    }));
    const parkingSnapshot = parkingDemoFor(conjunto);
    const vehicleSnapshot = vehicleDemoFor(conjunto, parkingSnapshot);
    const parkingRows = parkingSnapshot.map((parkingSpot) => ({
      id: parkingSpot.id,
      conjunto_id: conjunto.id,
      codigo: parkingSpot.code,
      codigo_normalizado: parkingSpot.code.toUpperCase().replace(/[^A-Z0-9]/g, ""),
      tipo: parkingSpot.kind === "zone" ? "zona" : "unidad",
      sector: parkingSpot.sector,
      numero: parkingSpot.number,
      unidad_base_id: parkingSpot.linkedUnit
        ? units.find((unit) => unit.codigo === parkingSpot.linkedUnit)?.id
        : null,
      estado: parkingSpot.status === "assigned" ? "asignado" : "disponible"
    }));
    const vehicleRows = vehicleSnapshot.map((vehicle) => ({
      id: vehicle.id,
      conjunto_id: conjunto.id,
      persona_id: vehicle.personId,
      unidad_id: units.find((unit) => unit.codigo === vehicle.unit)?.id,
      placa: vehicle.plate,
      placa_normalizada: vehicle.plate,
      clase:
        vehicle.kind === "car"
          ? "automovil"
          : vehicle.kind === "motorcycle"
            ? "motocicleta"
            : "otro",
      marca: vehicle.brand,
      color: vehicle.color,
      estado_acceso: vehicle.accessStatus === "authorized" ? "autorizado" : "suspendido",
      vigente_desde: vehicle.validFrom,
      vigente_hasta: vehicle.validUntil
    }));
    const parkingAssignments = parkingSnapshot
      .filter((parkingSpot) => parkingSpot.assignedVehicleId)
      .map((parkingSpot, index) => {
        const vehicle = vehicleSnapshot.find(
          (candidate) => candidate.id === parkingSpot.assignedVehicleId
        );
        return {
          id: stableId(conjunto.digit, 12, index + 1),
          conjunto_id: conjunto.id,
          parqueadero_id: parkingSpot.id,
          unidad_id: units.find((unit) => unit.codigo === vehicle.unit)?.id,
          vehiculo_id: vehicle.id,
          vigente_desde: "2026-07-01",
          activa: true
        };
      });
    const vehicleAccessEvents = [
      {
        id: stableId(conjunto.digit, 11, 1),
        conjunto_id: conjunto.id,
        vehiculo_id: vehicleSnapshot[0].id,
        placa_normalizada: vehicleSnapshot[0].plate,
        direccion: "ingreso",
        decision: "autorizado",
        motivo: "registered_vehicle",
        origen: "permanente",
        unidad_id: units[0].id,
        parqueadero_id: vehicleSnapshot[0].parkingSpotId,
        actor_usuario_id: admin.id,
        ocurrido_en: iso(28, "07:35:00")
      },
      {
        id: stableId(conjunto.digit, 11, 2),
        conjunto_id: conjunto.id,
        vehiculo_id: vehicleSnapshot[2].id,
        placa_normalizada: vehicleSnapshot[2].plate,
        direccion: "ingreso",
        decision: "denegado",
        motivo: "suspended_vehicle",
        origen: "permanente",
        unidad_id: units[2].id,
        parqueadero_id: null,
        actor_usuario_id: admin.id,
        ocurrido_en: iso(28, "08:12:00")
      },
      {
        id: stableId(conjunto.digit, 11, 3),
        conjunto_id: conjunto.id,
        vehiculo_id: null,
        placa_normalizada: `XYZ${conjunto.digit}9`,
        direccion: "ingreso",
        decision: "denegado",
        motivo: "unknown_vehicle",
        origen: "desconocido",
        unidad_id: null,
        parqueadero_id: null,
        actor_usuario_id: admin.id,
        ocurrido_en: iso(28, "09:04:00")
      }
    ];
    const generation = {
      id: stableId(conjunto.digit, 4, 1),
      conjunto_id: conjunto.id,
      periodo: "2026-07-01",
      tipo: "administracion",
      concepto: "Administración julio 2026",
      presupuesto_minor: 200000000,
      idempotencia_clave: `demo-comercial:${conjunto.id}:2026-07`,
      creado_por_usuario_id: admin.id
    };
    const fees = units.map((unit, index) => ({
      id: stableId(conjunto.digit, 5, index + 1),
      conjunto_id: conjunto.id,
      generacion_id: generation.id,
      unidad_id: unit.id,
      concepto: "Administración julio 2026",
      monto_minor: 50000000 + index * 250000,
      coeficiente_aplicado: 25,
      vence_en: "2026-07-10"
    }));
    const movements = fees.flatMap((fee, index) => {
      const base = {
        id: stableId(conjunto.digit, 6, index + 1),
        conjunto_id: conjunto.id,
        unidad_id: units[index].id,
        cuota_id: fee.id,
        tipo: "cuota_generada",
        monto_minor: fee.monto_minor,
        idempotencia_clave: `demo:cuota:${fee.id}`,
        actor_usuario_id: admin.id,
        motivo: "Generación de cuota para demostración comercial",
        metadata: { demo: true }
      };
      if (index !== 1) return [base];
      return [
        base,
        {
          id: stableId(conjunto.digit, 7, index + 1),
          conjunto_id: conjunto.id,
          unidad_id: units[index].id,
          cuota_id: fee.id,
          tipo: "pago_aplicado",
          monto_minor: -fee.monto_minor,
          idempotencia_clave: `demo:pago:${fee.id}`,
          actor_usuario_id: admin.id,
          motivo: "Pago sandbox aplicado durante preparación del demo",
          metadata: { demo: true, provider: "mock" }
        }
      ];
    });
    const audit = [
      "demo.conjunto_preparado",
      "demo.residentes_cargados",
      "demo.cuotas_generadas"
    ].map((action, index) => ({
      id: stableId(conjunto.digit, 8, index + 1),
      conjunto_id: conjunto.id,
      actor_usuario_id: admin.id,
      accion: action,
      recurso_tipo: "escenario_demo",
      recurso_id: conjunto.id,
      datos: { demo: true, source: "seed-commercial-demo" },
      ocurrido_en: iso(28, `${String(8 + index).padStart(2, "0")}:00:00`)
    }));
    const communicationRows = demoSnapshot.announcements.map((announcement) => ({
      id: announcement.id,
      conjunto_id: conjunto.id,
      titulo: announcement.title,
      mensaje: announcement.message,
      audiencia:
        announcement.audience === "Propietarios"
          ? "owners"
          : announcement.audience === "Residentes con mascotas"
            ? "residents_with_pets"
            : "all_residents",
      canales: [
        announcement.channel.includes("App") ? "app" : null,
        announcement.channel.toLowerCase().includes("correo") ? "email" : null,
        announcement.channel.includes("WhatsApp") ? "whatsapp" : null
      ].filter(Boolean),
      publicado_en: announcement.publishedAt,
      entrega_porcentaje: announcement.deliveryRate,
      estado:
        announcement.status === "published"
          ? "publicado"
          : announcement.status === "scheduled"
            ? "programado"
            : "borrador",
      creado_por_usuario_id: admin.id
    }));
    const assemblyRows = demoSnapshot.assemblies.map((assembly) => ({
      id: assembly.id,
      conjunto_id: conjunto.id,
      titulo: assembly.title,
      tipo:
        assembly.type === "ordinary"
          ? "ordinaria"
          : assembly.type === "extraordinary"
            ? "extraordinaria"
            : "informativa",
      modalidad:
        assembly.mode === "Presencial"
          ? "presencial"
          : assembly.mode === "Virtual"
            ? "virtual"
            : "hibrida",
      inicia_en: assembly.date,
      ubicacion: assembly.location,
      orden_del_dia: assembly.agenda,
      estado:
        assembly.status === "closed"
          ? "cerrada"
          : assembly.status === "in_progress"
            ? "en_curso"
            : "programada",
      creado_por_usuario_id: admin.id
    }));

    await upsert("unidades", units);
    await upsert("personas", people);
    await upsert("personas_unidades", links);
    await upsert("mascotas", petRows);
    await upsert("parqueaderos", parkingRows);
    await upsert("vehiculos", vehicleRows);
    await upsert("asignaciones_parqueadero", parkingAssignments);
    await upsert("eventos_acceso_vehicular", vehicleAccessEvents, {
      onConflict: "id",
      ignoreDuplicates: true
    });
    await upsert("generaciones_cuotas", [generation], { onConflict: "id", ignoreDuplicates: true });
    await upsert("cuotas", fees, { onConflict: "id", ignoreDuplicates: true });
    await upsert("movimientos_cuenta", movements, { onConflict: "id", ignoreDuplicates: true });
    await upsert("comunicados", communicationRows);
    await upsert("asambleas", assemblyRows);
    await upsert("eventos_auditoria", audit, { onConflict: "id", ignoreDuplicates: true });
    await upsert("escenarios_demo", [{ conjunto_id: conjunto.id, snapshot: demoSnapshot }], {
      onConflict: "conjunto_id"
    });
  }

  console.log(
    JSON.stringify({
      adminEmail: demoAdminEmail,
      residentAccounts: conjuntos.map((item) => ({
        conjunto: item.name,
        email: item.residentEmail,
        unit: item.residents[0][1]
      })),
      conjuntos: conjuntos.length,
      residentes: conjuntos.reduce((total, item) => total + item.residents.length, 0),
      escenarios: conjuntos.map((item) => item.name)
    })
  );
}

await main();
