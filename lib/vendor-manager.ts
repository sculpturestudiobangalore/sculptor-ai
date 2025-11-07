import { supabase } from './supabase';

export interface Vendor {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  materials_supplied: string[] | null;
  notes: string | null;
  // We'll add our custom fields as virtual properties
  type?: 'molding' | 'casting' | 'painting' | 'brass' | 'other';
  reliability_score?: number;
  average_response_time?: number;
  is_available?: boolean;
  current_workload?: number;
}

export class VendorManager {
  // Map vendor names to types based on your workflow
  private static vendorTypeMap: { [key: string]: string } = {
    'pannuswami': 'molding',
    'kutti': 'casting', 
    'chotu': 'brass',
    'pinto': 'painting'
  };

  // Default reliability scores based on your experience
  private static defaultReliability: { [key: string]: number } = {
    'pannuswami': 85,
    'kutti': 90,
    'chotu': 75,
    'pinto': 88
  };

  static async getVendorAvailability(vendorId: string): Promise<{available: boolean; next_available?: Date; reason?: string}> {
    const vendor = await this.getVendor(vendorId);
    
    if (!vendor) {
      return { available: false, reason: 'Vendor not found' };
    }

    // For now, we'll assume all vendors are available
    // In a real implementation, you'd track this in a separate table
    return { available: true };
  }

  static async getVendor(vendorId: string): Promise<Vendor | null> {
    const { data: vendor, error } = await supabase
      .from('external_vendors')
      .select('*')
      .eq('id', vendorId)
      .single();

    if (error || !vendor) {
      return null;
    }

    return this.enrichVendorData(vendor);
  }

  static async getVendorsByType(type: string): Promise<Vendor[]> {
    const { data: vendors, error } = await supabase
      .from('external_vendors')
      .select('*');

    if (error) return [];

    // Filter vendors by type based on name mapping
    const filteredVendors = vendors.filter(vendor => {
      const vendorType = this.getVendorType(vendor);
      return vendorType === type;
    });

    return filteredVendors.map(vendor => this.enrichVendorData(vendor));
  }

  static async getAllVendors(): Promise<Vendor[]> {
    const { data: vendors, error } = await supabase
      .from('external_vendors')
      .select('*')
      .order('name');

    if (error) return [];

    return vendors.map(vendor => this.enrichVendorData(vendor));
  }

  static async findVendorForTask(taskName: string): Promise<Vendor | null> {
    const allVendors = await this.getAllVendors();
    const taskType = this.getTaskVendorType(taskName);
    
    if (!taskType) return null;

    // Find the best vendor for this task type
    const suitableVendors = allVendors.filter(vendor => 
      vendor.type === taskType && vendor.is_available
    );

    // Return the most reliable vendor
    return suitableVendors.sort((a, b) => 
      (b.reliability_score || 0) - (a.reliability_score || 0)
    )[0] || null;
  }

  private static enrichVendorData(vendor: any): Vendor {
    const type = this.getVendorType(vendor);
    const reliability_score = this.defaultReliability[vendor.name?.toLowerCase()] || 80;
    
    return {
      ...vendor,
      type,
      reliability_score,
      average_response_time: 24, // Default 24 hours
      is_available: true, // Assume available unless told otherwise
      current_workload: 0 // Start with 0 workload
    };
  }

  private static getVendorType(vendor: any): string {
    const name = vendor.name?.toLowerCase() || '';
    
    // Check our mapping first
    for (const [vendorName, type] of Object.entries(this.vendorTypeMap)) {
      if (name.includes(vendorName)) {
        return type;
      }
    }

    // Fallback: infer from materials supplied
    if (vendor.materials_supplied?.some((mat: string) => 
      mat.toLowerCase().includes('clay') || mat.toLowerCase().includes('mold'))) {
      return 'molding';
    }
    if (vendor.materials_supplied?.some((mat: string) => 
      mat.toLowerCase().includes('frp') || mat.toLowerCase().includes('resin'))) {
      return 'casting';
    }
    if (vendor.materials_supplied?.some((mat: string) => 
      mat.toLowerCase().includes('brass') || mat.toLowerCase().includes('metal'))) {
      return 'brass';
    }
    if (vendor.materials_supplied?.some((mat: string) => 
      mat.toLowerCase().includes('paint') || mat.toLowerCase().includes('lacquer'))) {
      return 'painting';
    }

    return 'other';
  }

  private static getTaskVendorType(taskName: string): string | null {
    const name = taskName.toLowerCase();
    
    if (name.includes('moulding')) return 'molding';
    if (name.includes('casting') && !name.includes('brass')) return 'casting';
    if (name.includes('brass')) return 'brass';
    if (name.includes('paint')) return 'painting';
    
    return null;
  }

  static async recordVendorInteraction(vendorId: string, interaction: {
    type: 'assignment' | 'completion' | 'delay' | 'quality_issue';
    project_id?: string;
    task_id?: string;
    notes: string;
    duration_hours?: number;
  }): Promise<void> {
    // We'll create a separate table for vendor interactions
    const { error } = await supabase
      .from('vendor_interactions')
      .insert({
        vendor_id: vendorId,
        ...interaction,
        recorded_at: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to record vendor interaction:', error);
    }
  }
}