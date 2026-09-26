// Server-side validation and sequence logic for PCP Raw Material Inventory Demands

routerAdd("GET", "/backend/v1/pcp-inventory-demands-next-number", (e) => {
  const currentYear = new Date().getFullYear();
  const prefix = "INV-" + currentYear + "-";

  try {
    const records = $app.findRecordsByFilter(
      "pcp_mp_inventory_demands",
      "control_number ~ {:prefix}",
      "-created",
      1,
      0,
      { prefix: prefix }
    );

    let nextSeq = 1;
    if (records && records.length > 0) {
      const lastNum = records[0].getString("control_number");
      const parts = lastNum.split("-");
      if (parts.length === 3) {
        const parsed = parseInt(parts[2], 10);
        if (!isNaN(parsed)) {
          nextSeq = parsed + 1;
        }
      }
    }

    const padded = String(nextSeq).padStart(6, "0");
    const nextNumber = prefix + padded;

    return e.json(200, {
      nextNumber: nextNumber,
      year: currentYear,
      seq: nextSeq
    });
  } catch (err) {
    const fallbackSeq = String(Date.now()).slice(-6);
    return e.json(200, {
      nextNumber: prefix + fallbackSeq,
      year: currentYear,
      seq: parseInt(fallbackSeq, 10)
    });
  }
});

onRecordCreateRequest((e) => {
  const collectionName = e.record.collection().name;
  if (collectionName === "pcp_mp_inventory_demands") {
    const ctrl = e.record.getString("control_number");
    if (!ctrl || !ctrl.startsWith("INV-")) {
      throw new BadRequestError("Número de controle INV-AAAA-###### inválido.");
    }

    try {
      const existing = $app.findFirstRecordByData("pcp_mp_inventory_demands", "control_number", ctrl);
      if (existing) {
        throw new BadRequestError("Número de controle " + ctrl + " já foi utilizado.");
      }
    } catch (_) {
      // not found is valid
    }
  }

  if (collectionName === "pcp_mp_inventory_entries") {
    const pieces = e.record.getInt("pieces_count");
    if (pieces < 0) {
      throw new BadRequestError("O número de peças não pode ser negativo.");
    }
  }
}, "pcp_mp_inventory_demands", "pcp_mp_inventory_entries");
