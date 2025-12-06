-- Step 1: Add new columns for bank details
ALTER TABLE business_config 
ADD COLUMN IF NOT EXISTS bank_details jsonb,
ADD COLUMN IF NOT EXISTS non_gst_bank_details jsonb;

-- Step 2: Update the bank details for the existing record
UPDATE business_config
SET 
  -- GST Bank Details (Sculpture Studio Bangalore - SBI)
  bank_details = jsonb_build_object(
    'accountName', 'Sculpture Studio Bangalore',
    'bankName', 'State Bank of India',
    'accountNumber', '37641718521',
    'ifscCode', 'SBIN0001811',
    'branch', 'Sadashivnagar (Bangalore)',
    'pan', 'AGWPY2066N'
  ),
  -- Non-GST Bank Details (Dhanush Kiran GP - HDFC)
  non_gst_bank_details = jsonb_build_object(
    'accountName', 'Dhanush Kiran GP',
    'bankName', 'HDFC Bank',
    'accountNumber', '50100296011576',
    'ifscCode', 'HDFC0000312',
    'branch', 'Vijaynagar Branch (Bangalore)'
  );

-- Step 3: Verify the update
SELECT 
  id,
  business_name,
  bank_details,
  non_gst_bank_details
FROM business_config;
