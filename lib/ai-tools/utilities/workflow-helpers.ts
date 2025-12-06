import { supabase } from "@/lib/supabase";

/**
 * Intelligent "get or create" helper for clients.
 * Searches for a client by name (case-insensitive). If found, returns the client.
 * If not found, creates a new client with just the name.
 *
 * @param name - Client name to search for or create
 * @param details - Optional additional details for auto-creation (email, phone, etc.)
 * @returns Object with client ID, name, and whether it was newly created
 */
export async function getOrCreateClient(
  name: string,
  details?: {
    email?: string;
    phone?: string;
    company?: string;
    address?: string;
    state_code?: string;
    gstin?: string;
  }
): Promise<{
  success: boolean;
  clientId?: string;
  clientName?: string;
  created?: boolean;
  error?: string;
}> {
  try {
    // Step 1: Search for existing client (case-insensitive)
    const { data: existingClients, error: searchError } = await supabase
      .from("clients")
      .select("id, name, email, phone")
      .ilike("name", name)
      .limit(5);

    if (searchError) {
      return {
        success: false,
        error: `Database error while searching for client: ${searchError.message}`,
      };
    }

    // Step 2: If exact match found, return it
    if (existingClients && existingClients.length > 0) {
      // Check for exact match (case-insensitive)
      const exactMatch = existingClients.find(
        (c) => c.name.toLowerCase() === name.toLowerCase()
      );

      if (exactMatch) {
        return {
          success: true,
          clientId: exactMatch.id,
          clientName: exactMatch.name,
          created: false,
        };
      }

      // If multiple partial matches, check if we should create or use the first one
      // For simplicity, if there's a very close fuzzy match, use it
      // Otherwise, create new
      const firstMatch = existingClients[0];
      if (
        firstMatch.name.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(firstMatch.name.toLowerCase())
      ) {
        return {
          success: true,
          clientId: firstMatch.id,
          clientName: firstMatch.name,
          created: false,
        };
      }
    }

    // Step 3: Client not found - create new one
    const { data: newClient, error: createError } = await supabase
      .from("clients")
      .insert({
        name: name.trim(),
        email: details?.email || null,
        phone: details?.phone || null,
        company: details?.company || null,
        address: details?.address || null,
        state_code: details?.state_code
          ? details.state_code.toUpperCase()
          : null,
        gstin: details?.gstin || null,
        priority: "medium",
      })
      .select()
      .single();

    if (createError) {
      return {
        success: false,
        error: `Failed to create client: ${createError.message}`,
      };
    }

    return {
      success: true,
      clientId: newClient.id,
      clientName: newClient.name,
      created: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error in getOrCreateClient",
    };
  }
}

/**
 * Intelligent "get or create" helper for projects.
 * Searches for a project by name and client. If found, returns the project.
 * If not found, creates a new project.
 *
 * @param name - Project name
 * @param clientId - Client ID the project belongs to
 * @param details - Optional project details (budget, deadline, etc.)
 * @returns Object with project ID, name, and whether it was newly created
 */
export async function getOrCreateProject(
  name: string,
  clientId: string,
  details?: {
    budget?: number;
    deadline?: string;
    description?: string;
    status?:
      | "draft"
      | "quoted"
      | "waiting_approval"
      | "in_progress"
      | "completed";
  }
): Promise<{
  success: boolean;
  projectId?: string;
  projectName?: string;
  created?: boolean;
  error?: string;
}> {
  try {
    // Step 1: Search for existing project
    const { data: existingProjects, error: searchError } = await supabase
      .from("projects")
      .select("id, name")
      .eq("client_id", clientId)
      .ilike("name", name)
      .limit(1);

    if (searchError) {
      return {
        success: false,
        error: `Database error while searching for project: ${searchError.message}`,
      };
    }

    // Step 2: If found, return it
    if (existingProjects && existingProjects.length > 0) {
      const project = existingProjects[0];
      return {
        success: true,
        projectId: project.id,
        projectName: project.name,
        created: false,
      };
    }

    // Step 3: Project not found - create new one
    const { data: newProject, error: createError } = await supabase
      .from("projects")
      .insert({
        name: name.trim(),
        client_id: clientId,
        budget_amount: details?.budget || null,
        deadline: details?.deadline || null,
        description: details?.description || null,
        status: details?.status || "draft",
      })
      .select()
      .single();

    if (createError) {
      return {
        success: false,
        error: `Failed to create project: ${createError.message}`,
      };
    }

    return {
      success: true,
      projectId: newProject.id,
      projectName: newProject.name,
      created: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error in getOrCreateProject",
    };
  }
}
