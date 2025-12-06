import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateConfig() {
  console.log("Updating business config...");

  // First check if the column exists by selecting it
  const { data: checkData, error: checkError } = await supabase
    .from("business_config")
    .select("hsn_code")
    .eq("config_key", "business_tax")
    .single();

  if (checkError) {
    console.log(
      "Column hsn_code might not exist or row missing:",
      checkError.message
    );
    // If column doesn't exist, we can't easily add it via client.
    // But we can try to update config_value json if hsn_code column is missing.
    // finance-helpers.ts reads: hsnCode: data.hsn_code
    // It does NOT read from config_value.hsn_code.
    // So we MUST assume hsn_code column exists or update finance-helpers to read from config_value.

    // Let's try to update config_value as a fallback
    const { data: currentConfig } = await supabase
      .from("business_config")
      .select("config_value")
      .eq("config_key", "business_tax")
      .single();

    if (currentConfig) {
      const newConfig = { ...currentConfig.config_value, hsn_code: "97030090" };
      const { error: updateError } = await supabase
        .from("business_config")
        .update({ config_value: newConfig })
        .eq("config_key", "business_tax");

      if (updateError)
        console.error("Failed to update config_value:", updateError);
      else console.log("Updated config_value with hsn_code");
    }
  } else {
    // Column exists, update it
    const { error } = await supabase
      .from("business_config")
      .update({ hsn_code: "97030090" })
      .eq("config_key", "business_tax");

    if (error) {
      console.error("Error updating hsn_code:", error);
    } else {
      console.log("Successfully updated hsn_code to 97030090");
    }
  }
}

updateConfig();
