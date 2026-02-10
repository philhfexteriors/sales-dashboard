import React from 'react'
import { Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer'

// Register a clean sans-serif font
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.0/files/inter-latin-400-normal.woff', fontWeight: 400 },
    { src: 'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.0/files/inter-latin-600-normal.woff', fontWeight: 600 },
    { src: 'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.0/files/inter-latin-700-normal.woff', fontWeight: 700 },
  ],
})

const PRIMARY = '#A30A32'
const GRAY_700 = '#374151'
const GRAY_500 = '#6B7280'
const GRAY_200 = '#E5E7EB'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 9,
    color: GRAY_700,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: PRIMARY,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: PRIMARY,
  },
  headerSub: {
    fontSize: 8,
    color: GRAY_500,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: PRIMARY,
    marginBottom: 6,
    marginTop: 14,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_200,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  rowAlt: {
    backgroundColor: '#F9FAFB',
  },
  label: {
    fontSize: 9,
    color: GRAY_500,
    width: '35%',
  },
  value: {
    fontSize: 9,
    fontWeight: 600,
    width: '45%',
  },
  amount: {
    fontSize: 9,
    fontWeight: 600,
    width: '20%',
    textAlign: 'right',
  },
  totalSection: {
    marginTop: 16,
    padding: 12,
    borderWidth: 2,
    borderColor: PRIMARY,
    borderRadius: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: 700,
  },
  totalValue: {
    fontSize: 11,
    fontWeight: 700,
    color: PRIMARY,
  },
  subtotalLabel: {
    fontSize: 9,
    color: GRAY_500,
  },
  subtotalValue: {
    fontSize: 9,
    fontWeight: 600,
  },
  signatureSection: {
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: GRAY_200,
  },
  signatureImage: {
    width: 200,
    height: 60,
    marginBottom: 4,
  },
  signatureLine: {
    width: 200,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_700,
    marginBottom: 2,
  },
  signatureLabel: {
    fontSize: 8,
    color: GRAY_500,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 7,
    color: GRAY_500,
    borderTopWidth: 1,
    borderTopColor: GRAY_200,
    paddingTop: 6,
  },
  termsTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: PRIMARY,
    marginBottom: 12,
    textAlign: 'center',
  },
  termsText: {
    fontSize: 8,
    lineHeight: 1.6,
    color: GRAY_700,
  },
  clientGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  clientField: {
    width: '50%',
    paddingVertical: 2,
    paddingRight: 8,
  },
  clientFieldLabel: {
    fontSize: 7,
    color: GRAY_500,
    marginBottom: 1,
  },
  clientFieldValue: {
    fontSize: 9,
    fontWeight: 600,
  },
})

interface PlanPDFData {
  plan: {
    client_name: string
    client_address: string
    client_city: string
    client_state: string
    client_zip: string
    client_phone: string
    client_email: string
    is_retail: boolean
    is_insurance: boolean
    sale_price: number | null
    insurance_proceeds: number | null
    down_payment: number | null
    out_of_pocket: number | null
    payment_notes: string | null
    signature_data: string | null
    signed_by_name: string | null
    signed_at: string | null
    shingle_initials_data: string | null
  }
  lineItems: {
    section: string
    field_key: string
    selections: Record<string, string> | null
    options: Record<string, unknown> | null
    description: string | null
    amount: number
  }[]
  termsContent: string | null
}

function fmt(val: number | null): string {
  if (val == null) return '$0.00'
  return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

function formatFieldKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function getItemDisplay(item: PlanPDFData['lineItems'][0]): string {
  const parts: string[] = []

  if (item.selections) {
    const vals = Object.entries(item.selections)
      .filter(([k]) => !k.endsWith('_id'))
      .map(([, v]) => v)
      .filter(Boolean)
    if (vals.length) parts.push(vals.join(' / '))
  }

  if (item.options) {
    const optParts: string[] = []
    for (const [k, v] of Object.entries(item.options)) {
      if (k.endsWith('_id') || k === 'option_id') continue
      if (typeof v === 'boolean' && v) optParts.push(formatFieldKey(k))
      else if (typeof v === 'string' && v) optParts.push(v)
      else if (typeof v === 'number' && v > 0 && k !== 'count') optParts.push(`${v}`)
      else if (Array.isArray(v) && v.length) optParts.push(v.map(formatFieldKey).join(', '))
    }
    if (item.options.count && (item.options.count as number) > 0) {
      optParts.unshift(`Qty: ${item.options.count}`)
    }
    if (optParts.length) parts.push(optParts.join(' · '))
  }

  if (item.description) parts.push(item.description)

  return parts.join(' — ') || '—'
}

const SECTION_LABELS: Record<string, string> = {
  roof: 'Roof',
  siding: 'Siding',
  guttering: 'Guttering',
  windows: 'Windows',
  small_jobs: 'Small Jobs',
  misc: 'Miscellaneous',
}

export default function ProductionPlanPDF({ plan, lineItems, termsContent }: PlanPDFData) {
  const sections = ['roof', 'siding', 'guttering', 'windows', 'small_jobs', 'misc']
  const grouped = sections
    .map(s => ({
      section: s,
      items: lineItems.filter(li => li.section === s && (li.amount > 0 || li.description)),
    }))
    .filter(g => g.items.length > 0)

  const address = [plan.client_address, plan.client_city, plan.client_state, plan.client_zip]
    .filter(Boolean).join(', ')

  return (
    <Document>
      {/* Page 1: Production Plan */}
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>H&F Exteriors</Text>
            <Text style={styles.headerSub}>Production Plan & Contract</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 8, color: GRAY_500 }}>
              {plan.signed_at ? new Date(plan.signed_at).toLocaleDateString() : new Date().toLocaleDateString()}
            </Text>
            <Text style={{ fontSize: 8, color: GRAY_500 }}>
              {[plan.is_retail && 'Retail', plan.is_insurance && 'Insurance'].filter(Boolean).join(' + ')}
            </Text>
          </View>
        </View>

        {/* Client Info */}
        <Text style={styles.sectionTitle}>Client Information</Text>
        <View style={styles.clientGrid}>
          <View style={styles.clientField}>
            <Text style={styles.clientFieldLabel}>Name</Text>
            <Text style={styles.clientFieldValue}>{plan.client_name || '—'}</Text>
          </View>
          <View style={styles.clientField}>
            <Text style={styles.clientFieldLabel}>Phone</Text>
            <Text style={styles.clientFieldValue}>{plan.client_phone || '—'}</Text>
          </View>
          <View style={styles.clientField}>
            <Text style={styles.clientFieldLabel}>Address</Text>
            <Text style={styles.clientFieldValue}>{address || '—'}</Text>
          </View>
          <View style={styles.clientField}>
            <Text style={styles.clientFieldLabel}>Email</Text>
            <Text style={styles.clientFieldValue}>{plan.client_email || '—'}</Text>
          </View>
        </View>

        {/* Line Items by Section */}
        {grouped.map(group => (
          <View key={group.section} wrap={false}>
            <Text style={styles.sectionTitle}>{SECTION_LABELS[group.section] || group.section}</Text>
            {group.items.map((item, idx) => (
              <View key={`${item.section}-${item.field_key}`} style={[styles.row, idx % 2 === 1 ? styles.rowAlt : {}]}>
                <Text style={styles.label}>{formatFieldKey(item.field_key)}</Text>
                <Text style={styles.value}>{getItemDisplay(item)}</Text>
                <Text style={styles.amount}>{fmt(item.amount)}</Text>
              </View>
            ))}
          </View>
        ))}

        {/* Totals */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Sale Price</Text>
            <Text style={styles.totalValue}>{fmt(plan.sale_price)}</Text>
          </View>
          {plan.is_insurance && plan.insurance_proceeds != null && (
            <View style={styles.totalRow}>
              <Text style={styles.subtotalLabel}>Insurance Proceeds</Text>
              <Text style={styles.subtotalValue}>{fmt(plan.insurance_proceeds)}</Text>
            </View>
          )}
          {plan.is_retail && plan.down_payment != null && (
            <View style={styles.totalRow}>
              <Text style={styles.subtotalLabel}>Down Payment</Text>
              <Text style={styles.subtotalValue}>{fmt(plan.down_payment)}</Text>
            </View>
          )}
          {plan.out_of_pocket != null && (
            <View style={[styles.totalRow, { borderTopWidth: 1, borderTopColor: GRAY_200, paddingTop: 4, marginTop: 4 }]}>
              <Text style={styles.totalLabel}>Homeowner Out-of-Pocket</Text>
              <Text style={styles.totalValue}>{fmt(plan.out_of_pocket)}</Text>
            </View>
          )}
          {plan.payment_notes && (
            <View style={{ marginTop: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: GRAY_200 }}>
              <Text style={{ fontSize: 8, color: GRAY_500 }}>Payment Notes: {plan.payment_notes}</Text>
            </View>
          )}
        </View>

        {/* Shingle Initials */}
        {plan.shingle_initials_data && (
          <View style={{ marginTop: 12 }}>
            <Text style={{ fontSize: 8, color: GRAY_500, marginBottom: 2 }}>Shingle Selection Initials:</Text>
            <Image src={plan.shingle_initials_data} style={{ width: 60, height: 30 }} />
          </View>
        )}

        {/* Signature */}
        <View style={styles.signatureSection}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontSize: 9, fontWeight: 600, marginBottom: 6 }}>Client Signature</Text>
              {plan.signature_data ? (
                <Image src={plan.signature_data} style={styles.signatureImage} />
              ) : (
                <View style={styles.signatureLine} />
              )}
              <Text style={styles.signatureLabel}>
                {plan.signed_by_name || 'Name'}
                {plan.signed_at ? ` — ${new Date(plan.signed_at).toLocaleDateString()}` : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>H&F Exteriors · Production Plan & Contract · Confidential</Text>
        </View>
      </Page>

      {/* Page 2: Terms & Conditions */}
      {termsContent && (
        <Page size="LETTER" style={styles.page}>
          <Text style={styles.termsTitle}>Terms & Conditions</Text>
          <Text style={styles.termsText}>{termsContent}</Text>
          <View style={styles.footer} fixed>
            <Text>H&F Exteriors · Terms & Conditions · Confidential</Text>
          </View>
        </Page>
      )}
    </Document>
  )
}
