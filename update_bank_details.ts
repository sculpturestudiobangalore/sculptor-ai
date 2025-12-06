import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateBankDetails() {
  console.log("Updating bank details in business_config...");

  // First, check if non_gst_bank_details column exists
  // If not, we'll add it to the JSONB update

  const { data, error } = await supabase
    .from("business_config")
    .update({
      bank_details: {
        accountName: "Sculpture Studio Bangalore",
        bankName: "State Bank of India",
        accountNumber: "37641718521",
        ifscCode: "SBIN0001811",
        branch: "Sadashivnagar (Bangalore)",
        pan: "AGWPY2066N",
      },
      non_gst_bank_details: {
        accountName: "Dhanush Kiran GP",
        bankName: "HDFC Bank",
        accountNumber: "50100296011576",
        ifscCode: "HDFC0000312",
        branch: "Vijaynagar Branch (Bangalore)",
      },
    })
    .eq("id", 1) // Assuming first record
    .select();

  if (error) {
    console.error("Error updating bank details:", error);
  } else {
    console.log("Successfully updated bank details:", data);
  }
}

updateBankDetails();
