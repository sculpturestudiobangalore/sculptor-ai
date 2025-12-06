import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
  },
  header: {
    marginBottom: 20,
    borderBottom: '2px solid #10b981',
    paddingBottom: 10,
  },
  studioName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#047857',
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
    width: '70%',
    textAlign: 'left',
    paddingLeft: 8,
  },
  amount: {
    width: '30%',
    textAlign: 'right',
    paddingRight: 8,
  },
  totalRow: {
    flexDirection: 'row',
    borderTopColor: '#10b981',
    borderTopWidth: 2,
    alignItems: 'center',
    height: 30,
    marginTop: 10,
    fontWeight: 'bold',
  },
  projectInfo: {
    backgroundColor: '#ecfdf5',
    padding: 15,
    borderRadius: 5,
    marginBottom: 20,
  }
});

interface QuotationItem {
  description: string;
  amount: number;
}

interface QuotationData {
  quotationNumber: string;
  date: string;
  validUntil: string;
  client: {
    name: string;
    address: string;
    phone: string;
  };
  project: {
    name: string;
    type: string;
    deadline: string;
  };
  items: QuotationItem[];
  subtotal: number;
  tax: number;
  total: number;
  terms?: string;
}

export const QuotationTemplate = ({ data }: { data: QuotationData }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.studioName}>Dhanush Sculpture Studio</Text>
        <Text style={styles.title}>QUOTATION</Text>
        <Text>Quotation #: {data.quotationNumber}</Text>
        <Text>Date: {data.date}</Text>
        <Text>Valid Until: {data.validUntil}</Text>
      </View>

      {/* Client & Project Information */}
      <View style={styles.projectInfo}>
        <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Project:</Text>
        <Text>Client: {data.client.name}</Text>
        <Text>Project: {data.project.name} ({data.project.type})</Text>
        <Text>Deadline: {data.project.deadline}</Text>
        <Text>Contact: {data.client.phone}</Text>
      </View>

      {/* Items */}
      <View style={styles.section}>
        <View style={[styles.row, { backgroundColor: '#10b981', color: 'white' }]}>
          <Text style={[styles.description, { color: 'white' }]}>Description</Text>
          <Text style={[styles.amount, { color: 'white' }]}>Amount (₹)</Text>
        </View>

        {data.items.map((item, index) => (
          <View style={styles.row} key={index}>
            <Text style={styles.description}>{item.description}</Text>
            <Text style={styles.amount}>₹{item.amount.toLocaleString('en-IN')}</Text>
          </View>
        ))}

        {/* Totals */}
        <View style={styles.totalRow}>
          <Text style={styles.description}>Subtotal</Text>
          <Text style={styles.amount}>₹{data.subtotal.toLocaleString('en-IN')}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.description}>Tax (12%)</Text>
          <Text style={styles.amount}>₹{data.tax.toLocaleString('en-IN')}</Text>
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.description}>TOTAL</Text>
          <Text style={styles.amount}>₹{data.total.toLocaleString('en-IN')}</Text>
        </View>
      </View>

      {/* Terms */}
      {data.terms && (
        <View style={styles.section}>
          <Text style={{ fontWeight: 'bold' }}>Terms & Conditions:</Text>
          <Text>{data.terms}</Text>
        </View>
      )}

      {/* Footer */}
      <View style={[styles.section, { marginTop: 30 }]}>
        <Text style={{ textAlign: 'center', fontSize: 10, color: '#6b7280' }}>
          We appreciate the opportunity to work with you • Dhanush Sculpture Studio
        </Text>
      </View>
    </Page>
  </Document>
);