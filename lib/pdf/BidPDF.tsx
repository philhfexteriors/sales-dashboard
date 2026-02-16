import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'

// Register a clean sans-serif font (same as ProductionPlanPDF)
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
  // Table styles
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: GRAY_200,
    paddingBottom: 4,
    marginBottom: 2,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontWeight: 700,
    color: GRAY_500,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    paddingHorizontal: 2,
  },
  tableRowAlt: {
    backgroundColor: '#F9FAFB',
  },
  tableCell: {
    fontSize: 9,
  },
  tableCellRight: {
    fontSize: 9,
    textAlign: 'right',
  },
  // Column widths
  colDescription: { width: '50%' },
  colQty: { width: '15%', textAlign: 'right' },
  colUnit: { width: '10%', textAlign: 'center' },
  colPrice: { width: '25%', textAlign: 'right' },
  // Totals
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
  notesSection: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 4,
  },
  notesLabel: {
    fontSize: 8,
    fontWeight: 600,
    color: GRAY_500,
    marginBottom: 2,
  },
  notesText: {
    fontSize: 9,
    color: GRAY_700,
    lineHeight: 1.4,
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
})

interface BidPDFData {
  bid: {
    client_name: string | null
    client_address: string | null
    client_city: string | null
    client_state: string | null
    client_zip: string | null
    client_phone: string | null
    client_email: string | null
    trade: string
    material_variant: string | null
    pitch: string | null
    notes: string | null
    tax_rate: number
    materials_total: number
    labor_total: number
    tax_total: number
    grand_total: number
  }
  lineItems: {
    section: string
    description: string
    qty: number
    unit: string
    line_total: number
    sort_order: number
  }[]
  versionNumber: number
}

function fmtAmount(val: number | null): string {
  if (val == null || val === 0) return ''
  return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

function fmtTotal(val: number | null): string {
  if (val == null) return '$0.00'
  return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

function formatTrade(trade: string): string {
  return trade.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function BidPDF({ bid, lineItems, versionNumber }: BidPDFData) {
  const materialsItems = lineItems
    .filter(li => li.section === 'materials')
    .sort((a, b) => a.sort_order - b.sort_order)
  const laborItems = lineItems
    .filter(li => li.section === 'labor')
    .sort((a, b) => a.sort_order - b.sort_order)

  const materialsSubtotal = materialsItems.reduce((sum, li) => sum + li.line_total, 0)
  const laborSubtotal = laborItems.reduce((sum, li) => sum + li.line_total, 0)

  const address = [bid.client_address, bid.client_city, bid.client_state, bid.client_zip]
    .filter(Boolean).join(', ')

  const displayDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const tradeLabel = formatTrade(bid.trade)
  const variantLabel = bid.material_variant
    ? ` (${formatTrade(bid.material_variant)})`
    : ''

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>H&F Exteriors</Text>
            <Text style={styles.headerSub}>Bid Estimate — {tradeLabel}{variantLabel}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 8, color: GRAY_500 }}>{displayDate}</Text>
            <Text style={{ fontSize: 8, color: GRAY_500 }}>Version {versionNumber}</Text>
          </View>
        </View>

        {/* Client Info */}
        <Text style={styles.sectionTitle}>Client Information</Text>
        <View style={styles.clientGrid}>
          <View style={styles.clientField}>
            <Text style={styles.clientFieldLabel}>Name</Text>
            <Text style={styles.clientFieldValue}>{bid.client_name || '—'}</Text>
          </View>
          <View style={styles.clientField}>
            <Text style={styles.clientFieldLabel}>Phone</Text>
            <Text style={styles.clientFieldValue}>{bid.client_phone || '—'}</Text>
          </View>
          <View style={styles.clientField}>
            <Text style={styles.clientFieldLabel}>Address</Text>
            <Text style={styles.clientFieldValue}>{address || '—'}</Text>
          </View>
          <View style={styles.clientField}>
            <Text style={styles.clientFieldLabel}>Email</Text>
            <Text style={styles.clientFieldValue}>{bid.client_email || '—'}</Text>
          </View>
        </View>

        {/* Materials Table */}
        {materialsItems.length > 0 && (
          <View wrap={false}>
            <Text style={styles.sectionTitle}>Materials</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colDescription]}>Description</Text>
              <Text style={[styles.tableHeaderCell, styles.colQty]}>Qty</Text>
              <Text style={[styles.tableHeaderCell, styles.colUnit]}>Unit</Text>
              <Text style={[styles.tableHeaderCell, styles.colPrice]}>Price</Text>
            </View>
            {materialsItems.map((item, idx) => (
              <View key={`mat-${idx}`} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}>
                <Text style={[styles.tableCell, styles.colDescription]}>{item.description}</Text>
                <Text style={[styles.tableCellRight, styles.colQty]}>{item.qty}</Text>
                <Text style={[styles.tableCell, styles.colUnit, { textAlign: 'center' }]}>{item.unit}</Text>
                <Text style={[styles.tableCellRight, styles.colPrice]}>{fmtAmount(item.line_total)}</Text>
              </View>
            ))}
            <View style={[styles.tableRow, { borderTopWidth: 1, borderTopColor: GRAY_200, marginTop: 2 }]}>
              <Text style={[styles.subtotalLabel, { width: '75%', textAlign: 'right', paddingRight: 8 }]}>
                Materials Subtotal
              </Text>
              <Text style={[styles.subtotalValue, styles.colPrice]}>{fmtTotal(materialsSubtotal)}</Text>
            </View>
          </View>
        )}

        {/* Labor Table */}
        {laborItems.length > 0 && (
          <View wrap={false}>
            <Text style={styles.sectionTitle}>Labor</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colDescription]}>Description</Text>
              <Text style={[styles.tableHeaderCell, styles.colQty]}>Qty</Text>
              <Text style={[styles.tableHeaderCell, styles.colUnit]}>Unit</Text>
              <Text style={[styles.tableHeaderCell, styles.colPrice]}>Price</Text>
            </View>
            {laborItems.map((item, idx) => (
              <View key={`lab-${idx}`} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}>
                <Text style={[styles.tableCell, styles.colDescription]}>{item.description}</Text>
                <Text style={[styles.tableCellRight, styles.colQty]}>{item.qty}</Text>
                <Text style={[styles.tableCell, styles.colUnit, { textAlign: 'center' }]}>{item.unit}</Text>
                <Text style={[styles.tableCellRight, styles.colPrice]}>{fmtAmount(item.line_total)}</Text>
              </View>
            ))}
            <View style={[styles.tableRow, { borderTopWidth: 1, borderTopColor: GRAY_200, marginTop: 2 }]}>
              <Text style={[styles.subtotalLabel, { width: '75%', textAlign: 'right', paddingRight: 8 }]}>
                Labor Subtotal
              </Text>
              <Text style={[styles.subtotalValue, styles.colPrice]}>{fmtTotal(laborSubtotal)}</Text>
            </View>
          </View>
        )}

        {/* Totals */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.subtotalLabel}>Materials</Text>
            <Text style={styles.subtotalValue}>{fmtTotal(bid.materials_total)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.subtotalLabel}>Labor</Text>
            <Text style={styles.subtotalValue}>{fmtTotal(bid.labor_total)}</Text>
          </View>
          {bid.tax_total > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.subtotalLabel}>Tax ({bid.tax_rate}%)</Text>
              <Text style={styles.subtotalValue}>{fmtTotal(bid.tax_total)}</Text>
            </View>
          )}
          <View style={[styles.totalRow, { borderTopWidth: 1, borderTopColor: GRAY_200, paddingTop: 6, marginTop: 4 }]}>
            <Text style={styles.totalLabel}>Total Investment</Text>
            <Text style={styles.totalValue}>{fmtTotal(bid.grand_total)}</Text>
          </View>
        </View>

        {/* Notes */}
        {bid.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{bid.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>H&F Exteriors · Bid Estimate · Confidential</Text>
        </View>
      </Page>
    </Document>
  )
}
