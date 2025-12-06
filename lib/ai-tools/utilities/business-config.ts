/**
 * Business Configuration Manager
 * Fetches configuration dynamically from Supabase business_config table
 * Includes caching, error handling, and type-safe config access
 */

import { supabase } from "@/lib/supabase";
import type { Json } from "@/lib/ai-tools/types";
import { getErrorMessage } from "./utils";

/**
 * Business configuration interface
 * Represents the structure of config values stored in database
 */
export interface BusinessConfig {
  team?: {
    [memberName: string]: {
      dailyHours: number;
      skills: string[];
    };
  };
  defaultRates?: {
    labor: number;
    tax: number;
  };
  businessTax?: {
    gstin: string;
    state_code: string;
    state_name: string;
    default_tax_rate: number;
    setup_at: string;
  };
  materialCategories?: string[];
  termsAndConditions?: string;
  paymentTerms?: string;
}

/**
 * In-memory cache for config with TTL
 */
interface ConfigCache {
  data: BusinessConfig;
  timestamp: number;
  ttl: number; // Time-to-live in milliseconds
}

let configCache: ConfigCache | null = null;
const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Parse JSON value from database to typed config value
 */
function parseConfigValue(json: Json): any {
  if (json === null) return null;
  if (typeof json === "object" && !Array.isArray(json)) {
    return json;
  }
  return json;
}

/**
 * Fetch all business configuration from Supabase
 * Returns cached data if available and not expired
 */
export async function getBusinessConfig(
  forceRefresh = false
): Promise<BusinessConfig> {
  // Check cache first
  if (!forceRefresh && configCache) {
    const now = Date.now();
    if (now - configCache.timestamp < configCache.ttl) {
      return configCache.data;
    }
  }

  try {
    const { data, error } = await supabase
      .from("business_config")
      .select("config_key, config_value");

    if (error) {
      throw new Error(`Failed to fetch business config: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error("No business configuration found in database");
    }

    // Build config object from key-value pairs
    const config: BusinessConfig = {};

    for (const row of data) {
      const key = row.config_key;
      const value = parseConfigValue(row.config_value);

      // Map database keys to config structure
      if (key === "business_tax") {
        config.businessTax = value;
      } else if (key.startsWith("team_")) {
        const memberName = key.replace("team_", "");
        if (!config.team) config.team = {};
        config.team[memberName] = value;
      } else if (key === "default_rates") {
        config.defaultRates = value;
      } else if (key === "material_categories") {
        config.materialCategories = value;
      } else if (key === "terms_and_conditions") {
        config.termsAndConditions = value;
      } else if (key === "payment_terms") {
        config.paymentTerms = value;
      }
    }

    // Cache the result
    configCache = {
      data: config,
      timestamp: Date.now(),
      ttl: DEFAULT_CACHE_TTL,
    };

    return config;
  } catch (error) {
    throw new Error(`Business config error: ${getErrorMessage(error)}`);
  }
}

/**
 * Get specific config value by key
 */
export async function getConfigValue<K extends keyof BusinessConfig>(
  key: K
): Promise<BusinessConfig[K] | null> {
  const config = await getBusinessConfig();
  return config[key] ?? null;
}

/**
 * Update business configuration in database
 * Automatically invalidates cache
 */
export async function updateBusinessConfig(
  configKey: string,
  configValue: any
): Promise<void> {
  try {
    const { error } = await supabase
      .from("business_config")
      .upsert({
        config_key: configKey,
        config_value: configValue as Json,
        updated_at: new Date().toISOString(),
      })
      .eq("config_key", configKey);

    if (error) {
      throw new Error(`Failed to update config: ${error.message}`);
    }

    // Invalidate cache
    configCache = null;
  } catch (error) {
    throw new Error(`Config update error: ${getErrorMessage(error)}`);
  }
}

/**
 * Clear config cache (useful for testing or forced refresh)
 */
export function clearConfigCache(): void {
  configCache = null;
}

/**
 * Get team member config by name
 */
export async function getTeamMember(memberName: string): Promise<{
  dailyHours: number;
  skills: string[];
} | null> {
  const config = await getBusinessConfig();
  return config.team?.[memberName] ?? null;
}

/**
 * Get all team members
 */
export async function getAllTeamMembers(): Promise<
  Record<string, { dailyHours: number; skills: string[] }>
> {
  const config = await getBusinessConfig();
  return config.team ?? {};
}

/**
 * Get tax configuration
 */
export async function getTaxConfig() {
  const config = await getBusinessConfig();
  return config.businessTax ?? null;
}

/**
 * Get default rates
 */
export async function getDefaultRates() {
  const config = await getBusinessConfig();
  return (
    config.defaultRates ?? {
      labor: 500,
      tax: 0.18,
    }
  );
}
