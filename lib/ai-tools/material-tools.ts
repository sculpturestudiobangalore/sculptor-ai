// lib/ai-tools/material-inventory-tools.ts
import { tool } from "ai";
import { z } from "zod";
import { supabase } from "@/lib/supabase";

/**
 * Add a new material to inventory.
 */
export const addMaterialTool = tool({
  name: "addMaterialTool",
  description: "Add new material to inventory. Requires unique name.",
  inputSchema: z.object({
    name: z.string(),
    unit: z.string(),
    category: z.string().optional(),
    unit_cost: z.number().optional(),
    reorder_level: z.number().optional(),
    notes: z.string().optional(),
    supplier: z.string().optional(),
  }),
  async execute(input) {
    const { data: exists } = await supabase
      .from("materials")
      .select("id")
      .eq("name", input.name)
      .single();

    if (exists && exists.id) {
      return {
        success: false,
        warning: "Material with this name already exists.",
        id: exists.id,
      };
    }

    const { data, error } = await supabase
      .from("materials")
      .insert({
        name: input.name,
        unit: input.unit,
        category: input.category ?? null,
        unit_cost: input.unit_cost ?? null,
        reorder_level: input.reorder_level ?? null,
        notes: input.notes ?? null,
        supplier: input.supplier ?? null,
        quantity_available: 0,
        quantity_reserved: 0,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return { success: true, material: data };
  },
});

/**
 * List all materials or filter by parameters
 */
export const listMaterialsTool = tool({
  name: "listMaterialsTool",
  description: "List materials in inventory.",
  inputSchema: z.object({
    name: z.string().optional(),
    category: z.string().optional(),
    unit: z.string().optional(),
  }),
  async execute(input) {
    let query = supabase.from("materials").select("*");

    if (input.name) query = query.ilike("name", `%${input.name}%`);
    if (input.category) query = query.eq("category", input.category);
    if (input.unit) query = query.eq("unit", input.unit);

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    return { success: true, materials: data };
  },
});

/**
 * Update material stock (available/reserved)
 */
export const updateMaterialStockTool = tool({
  name: "updateMaterialStockTool",
  description: "Update material stock quantities.",
  inputSchema: z.object({
    name: z.string(),
    quantity_available: z.number().optional(),
    quantity_reserved: z.number().optional(),
    notes: z.string().optional(),
  }),
  async execute(input) {
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (input.quantity_available !== undefined)
      updates.quantity_available = input.quantity_available;
    if (input.quantity_reserved !== undefined)
      updates.quantity_reserved = input.quantity_reserved;
    if (input.notes !== undefined) updates.notes = input.notes;

    const { data, error } = await supabase
      .from("materials")
      .update(updates)
      .eq("name", input.name)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return { success: true, material: data };
  },
});

/**
 * Record material usage against a project and update inventory and project_materials.
 * NOW ACCEPTS PROJECT NAME INSTEAD OF PROJECT_ID
 */
export const recordMaterialUsageTool = tool({
  name: "recordMaterialUsageTool",
  description:
    "Record material usage for a project by PROJECT NAME and update inventory and project materials.",
  inputSchema: z.object({
    projectName: z.string().describe("Project name"),
    materialName: z.string().describe("Material name"),
    quantityUsed: z.number().describe("Quantity used"),
    costAtTime: z.number().optional().describe("Cost at time of usage"),
    notes: z.string().optional(),
    usedDate: z.string().optional().describe("Date material was used"),
  }),
  async execute(input) {
    // 1. Find project by name
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, name")
      .ilike("name", input.projectName)
      .single();

    if (projectError || !project) {
      return {
        success: false,
        error: `Project "${input.projectName}" not found. Please check the project name.`,
      };
    }

    // 2. Find material
    const { data: material } = await supabase
      .from("materials")
      .select("id, unit_cost, quantity_available")
      .eq("name", input.materialName)
      .single();

    if (!material) {
      return {
        success: false,
        error: `Material "${input.materialName}" not found. Please add it to inventory first.`,
      };
    }

    // 3. Check if sufficient quantity available
    if (material.quantity_available < input.quantityUsed) {
      return {
        success: false,
        error: `Insufficient stock. Available: ${material.quantity_available}, Requested: ${input.quantityUsed}`,
      };
    }

    // 4. Insert into material_usage
    await supabase.from("material_usage").insert({
      project_id: project.id,
      material_id: material.id,
      quantity_used: input.quantityUsed,
      cost_at_time: input.costAtTime ?? material.unit_cost,
      used_date: input.usedDate ?? new Date().toISOString(),
      notes: input.notes ?? null,
    });

    // 5. Upsert into project_materials
    const { data: pm } = await supabase
      .from("project_materials")
      .select("id, quantity_used")
      .eq("material_id", material.id)
      .eq("project_id", project.id)
      .single();

    if (pm) {
      await supabase
        .from("project_materials")
        .update({
          quantity_used: (pm.quantity_used ?? 0) + input.quantityUsed,
          cost_at_time: input.costAtTime ?? material.unit_cost,
          used_date: input.usedDate ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", pm.id);
    } else {
      await supabase.from("project_materials").insert({
        project_name: project.name,
        material_id: material.id,
        quantity: 0,
        quantity_used: input.quantityUsed,
        cost_at_time: input.costAtTime ?? material.unit_cost,
        used_date: input.usedDate ?? new Date().toISOString(),
      });
    }

    // 6. Update inventory quantity_available
    await supabase
      .from("materials")
      .update({
        quantity_available: material.quantity_available - input.quantityUsed,
      })
      .eq("id", material.id);

    return {
      success: true,
      message: `${input.quantityUsed} ${material.unit_cost} of ${input.materialName} recorded for project "${project.name}". Inventory updated.`,
      project: project.name,
      material: input.materialName,
      quantityUsed: input.quantityUsed,
      remainingStock: material.quantity_available - input.quantityUsed,
    };
  },
});

/**
 * Generate reorder list of materials below reorder_level.
 */
export const generateReorderListTool = tool({
  name: "generateReorderListTool",
  description: "List materials below reorder level needing restocking.",
  inputSchema: z.object({}),
  async execute() {
    const { data, error } = await supabase
      .from("materials")
      .select("id, name, quantity_available, reorder_level, supplier");

    if (error) throw new Error(error.message);

    const lowStock = data.filter(
      (m) =>
        typeof m.quantity_available === "number" &&
        typeof m.reorder_level === "number" &&
        m.quantity_available <= m.reorder_level
    );

    return { success: true, reorderList: lowStock };
  },
});

/**
 * Record a new material purchase and update inventory cost and quantity.
 */
export const recordMaterialPurchaseTool = tool({
  name: "recordMaterialPurchaseTool",
  description: "Record material purchase and update inventory.",
  inputSchema: z.object({
    materialName: z.string(),
    vendorName: z.string(),
    quantity: z.number(),
    unit_cost: z.number().optional(),
    total_cost: z.number().optional(),
    purchase_date: z.string().optional(),
    invoice_number: z.string().optional(),
    notes: z.string().optional(),
  }),
  async execute(input) {
    const { data: material } = await supabase
      .from("materials")
      .select("id, unit_cost, quantity_available")
      .eq("name", input.materialName)
      .single();

    if (!material) {
      return {
        success: false,
        error: `Material "${input.materialName}" not found`,
      };
    }

    const { data: vendors } = await supabase
      .from("external_vendors")
      .select("id")
      .eq("name", input.vendorName);

    if (!vendors || vendors.length === 0) {
      return {
        success: false,
        error: `Vendor "${input.vendorName}" not found`,
      };
    }

    if (vendors.length > 1) {
      return {
        success: false,
        warning: "Duplicate vendors found. Please check the name.",
        matches: vendors,
      };
    }

    const purchase_date = input.purchase_date ?? new Date().toISOString();
    const unit_cost = input.unit_cost ?? material.unit_cost;
    const total_cost = input.total_cost ?? input.quantity * unit_cost;

    await supabase.from("material_purchases").insert({
      material_id: material.id,
      vendor_id: vendors[0].id,
      quantity: input.quantity,
      unit_cost,
      total_cost,
      purchase_date,
      invoice_number: input.invoice_number ?? null,
      notes: input.notes ?? null,
    });

    // Update material's cost and quantity
    await supabase
      .from("materials")
      .update({
        unit_cost,
        quantity_available: material.quantity_available + input.quantity,
        updated_at: new Date().toISOString(),
      })
      .eq("id", material.id);

    return {
      success: true,
      message: `Material purchase recorded.`,
    };
  },
});

/**
 * List material purchases filtered by material or vendor.
 */
export const listMaterialPurchasesTool = tool({
  name: "listMaterialPurchasesTool",
  description:
    "List material purchases filtered by material name or vendor name.",
  inputSchema: z.object({
    materialName: z.string().optional(),
    vendorName: z.string().optional(),
  }),
  async execute(input) {
    let query = supabase.from("material_purchases").select("*");

    if (input.materialName) {
      const { data: material } = await supabase
        .from("materials")
        .select("id")
        .eq("name", input.materialName)
        .single();

      if (!material) {
        return {
          success: false,
          error: `Material "${input.materialName}" not found`,
        };
      }

      query = query.eq("material_id", material.id);
    }

    if (input.vendorName) {
      const { data: vendor } = await supabase
        .from("external_vendors")
        .select("id")
        .eq("name", input.vendorName)
        .single();

      if (!vendor) {
        return {
          success: false,
          error: `Vendor "${input.vendorName}" not found`,
        };
      }

      query = query.eq("vendor_id", vendor.id);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    return { success: true, purchases: data };
  },
});

/**
 * Add a new vendor. Warn on duplicate names but allow.
 */
export const addVendorTool = tool({
  name: "addVendorTool",
  description:
    "Add external vendor to the system, duplicate names allowed with warning.",
  inputSchema: z.object({
    name: z.string(),
    contact_person: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    address: z.string().optional(),
    notes: z.string().optional(),
    materials_supplied: z.array(z.string()).optional(),
  }),
  async execute(input) {
    // Check for duplicate names
    const { data: existing } = await supabase
      .from("external_vendors")
      .select("id")
      .eq("name", input.name);

    const warning =
      existing && existing.length > 0
        ? "Duplicate vendor name exists."
        : undefined;

    const { data, error } = await supabase
      .from("external_vendors")
      .insert({
        name: input.name,
        contact_person: input.contact_person ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        address: input.address ?? null,
        notes: input.notes ?? null,
        materials_supplied: input.materials_supplied ?? [],
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return { success: true, vendor: data, warning };
  },
});

/**
 * List vendors with optional filters.
 */
export const listVendorsTool = tool({
  name: "listVendorsTool",
  description:
    "List external vendors with optional filtering by name or materials supplied.",
  inputSchema: z.object({
    name: z.string().optional(),
    materials_supplied: z.string().optional(),
  }),
  async execute(input) {
    let query = supabase.from("external_vendors").select("*");

    if (input.name) query = query.ilike("name", `%${input.name}%`);
    if (input.materials_supplied)
      query = query.contains("materials_supplied", [input.materials_supplied]);

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    return { success: true, vendors: data };
  },
});

/**
 * Get purchase history for a specific vendor.
 */
export const getVendorHistoryTool = tool({
  name: "getVendorHistoryTool",
  description: "Get purchase history and details for a vendor by name.",
  inputSchema: z.object({
    vendorName: z.string(),
  }),
  async execute(input) {
    const { data: vendor } = await supabase
      .from("external_vendors")
      .select("id")
      .eq("name", input.vendorName)
      .single();

    if (!vendor) {
      return {
        success: false,
        error: `Vendor "${input.vendorName}" not found`,
      };
    }

    const { data, error } = await supabase
      .from("material_purchases")
      .select("*")
      .eq("vendor_id", vendor.id);

    if (error) throw new Error(error.message);

    return { success: true, vendor_id: vendor.id, purchases: data };
  },
});

/**
 * Update material details.
 */
export const updateMaterialTool = tool({
  name: "updateMaterialTool",
  description: "Update material details like name, category, supplier, etc.",
  inputSchema: z.object({
    name: z.string().describe("Current material name"),
    newName: z.string().optional(),
    unit: z.string().optional(),
    category: z.string().optional(),
    unit_cost: z.number().optional(),
    reorder_level: z.number().optional(),
    notes: z.string().optional(),
    supplier: z.string().optional(),
  }),
  async execute(input) {
    const { data: material } = await supabase
      .from("materials")
      .select("id")
      .eq("name", input.name)
      .single();

    if (!material) {
      return {
        success: false,
        error: `Material "${input.name}" not found`,
      };
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (input.newName) updates.name = input.newName;
    if (input.unit) updates.unit = input.unit;
    if (input.category) updates.category = input.category;
    if (input.unit_cost !== undefined) updates.unit_cost = input.unit_cost;
    if (input.reorder_level !== undefined)
      updates.reorder_level = input.reorder_level;
    if (input.notes) updates.notes = input.notes;
    if (input.supplier) updates.supplier = input.supplier;

    const { data, error } = await supabase
      .from("materials")
      .update(updates)
      .eq("id", material.id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return { success: true, material: data };
  },
});

/**
 * Update vendor details.
 */
export const updateVendorTool = tool({
  name: "updateVendorTool",
  description: "Update vendor details.",
  inputSchema: z.object({
    name: z.string().describe("Current vendor name"),
    newName: z.string().optional(),
    contact_person: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    address: z.string().optional(),
    notes: z.string().optional(),
    materials_supplied: z.array(z.string()).optional(),
  }),
  async execute(input) {
    const { data: vendor } = await supabase
      .from("external_vendors")
      .select("id")
      .eq("name", input.name)
      .single();

    if (!vendor) {
      return {
        success: false,
        error: `Vendor "${input.name}" not found`,
      };
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (input.newName) updates.name = input.newName;
    if (input.contact_person) updates.contact_person = input.contact_person;
    if (input.phone) updates.phone = input.phone;
    if (input.email) updates.email = input.email;
    if (input.address) updates.address = input.address;
    if (input.notes) updates.notes = input.notes;
    if (input.materials_supplied)
      updates.materials_supplied = input.materials_supplied;

    const { data, error } = await supabase
      .from("external_vendors")
      .update(updates)
      .eq("id", vendor.id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return { success: true, vendor: data };
  },
});
