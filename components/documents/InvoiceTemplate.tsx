import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
  },
  header: {
    marginBottom: 20,
    borderBottom: '2px solid #3b82f6',
    paddingBottom: 10,
  },
  studioName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  section: {
    margin: 10,
    padding: 10,
  },
  row: {
    flexDirection: 'row',
    borderBottomColor: '#e5e7eb',
    borderBottomWidth: 1,
    alignItems: 'center',
    height: 24,
  },
  description: {
    width: '60%',
    textAlign: 'left',
    paddingLeft: 8,
  },
  quantity: {
    width: '10%',
    textAlign: 'right',
    paddingRight: 8,
  },
  rate: {
    width: '15%',
    textAlign: 'right',
    paddingRight: 8,
  },
  amount: {
    width: '15%',
    textAlign: 'right',
    paddingRight: 8,
  },
  totalRow: {
    flexDirection: 'row',
    borderTopColor: '#3b82f6',
    borderTopWidth: 2,
    alignItems: 'center',
    height: 30,
    marginTop: 10,
    fontWeight: 'bold',
  },
  clientInfo: {
    backgroundColor: '#f3f4f6',
    padding: 15,
    borderRadius: 5,
    marginBottom: 20,
  }
});

interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  client: {
    name: string;
    address: string;
    phone: string;
  };
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
}

export const InvoiceTemplate = ({ data }: { data: InvoiceData }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.studioName}>Dhanush Sculpture Studio</Text>
        <Text style={styles.title}>INVOICE</Text>
        <Text>Invoice #: {data.invoiceNumber}</Text>
        <Text>Date: {data.date}</Text>
        <Text>Due Date: {data.dueDate}</Text>
      </View>

      {/* Client Information */}
      <View style={styles.clientInfo}>
        <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Bill To:</Text>
        <Text>{data.client.name}</Text>
        <Text>{data.client.address}</Text>
        <Text>{data.client.phone}</Text>
      </View>

      {/* Items Table */}
      <View style={styles.section}>
        <View style={[styles.row, { backgroundColor: '#3b82f6', color: 'white' }]}>
          <Text style={[styles.description, { color: 'white' }]}>Description</Text>
          <Text style={[styles.quantity, { color: 'white' }]}>Qty</Text>
          <Text style={[styles.rate, { color: 'white' }]}>Rate (₹)</Text>
          <Text style={[styles.amount, { color: 'white' }]}>Amount (₹)</Text>
        </View>
        
        {data.items.map((item, index) => (
          <View style={styles.row} key={index}>
            <Text style={styles.description}>{item.description}</Text>
            <Text style={styles.quantity}>{item.quantity}</Text>
            <Text style={styles.rate}>{item.rate.toLocaleString('en-IN')}</Text>
            <Text style={styles.amount}>{item.amount.toLocaleString('en-IN')}</Text>
          </View>
        ))}

        {/* Totals */}
        <View style={styles.totalRow}>
          <Text style={styles.description}>Subtotal</Text>
          <Text style={styles.quantity}></Text>
          <Text style={styles.rate}></Text>
          <Text style={styles.amount}>₹{data.subtotal.toLocaleString('en-IN')}</Text>
        </View>
        
        <View style={styles.row}>
          <Text style={styles.description}>Tax (18%)</Text>
          <Text style={styles.quantity}></Text>
          <Text style={styles.rate}></Text>
          <Text style={styles.amount}>₹{data.tax.toLocaleString('en-IN')}</Text>
        </View>
        
        <View style={styles.totalRow}>
          <Text style={styles.description}>TOTAL</Text>
          <Text style={styles.quantity}></Text>
          <Text style={styles.rate}></Text>
          <Text style={styles.amount}>₹{data.total.toLocaleString('en-IN')}</Text>
        </View>
      </View>

      {/* Notes */}
      {data.notes && (
        <View style={styles.section}>
          <Text style={{ fontWeight: 'bold' }}>Notes:</Text>
          <Text>{data.notes}</Text>
        </View>
      )}

      {/* Footer */}
      <View style={[styles.section, { marginTop: 30 }]}>
        <Text style={{ textAlign: 'center', fontSize: 10, color: '#6b7280' }}>
          Thank you for your business! • Dhanush Sculpture Studio • +91 XXXXXXXXXX
        </Text>
      </View>
    </Page>
  </Document>
);