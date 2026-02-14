'use client'

import { useState, type FormEvent } from 'react'
import type { SubstanceType, BatchForm as BatchFormType, EstimatedPotency, DoseUnit, PsilocybinForm, LSDForm } from '@/types'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'

interface BatchFormData {
  name: string
  substance_type: SubstanceType
  form: BatchFormType
  estimated_potency: EstimatedPotency
  dose_unit: DoseUnit
  supplements: string
  source_notes: string
}

interface BatchFormProps {
  initialData?: Partial<BatchFormData>
  onSubmit: (data: BatchFormData) => void
  onCancel?: () => void
  isSubmitting?: boolean
}

const substanceTypeOptions = [
  { value: '', label: 'Select substance' },
  { value: 'psilocybin', label: 'Psilocybin (Mushrooms)' },
  { value: 'lsd', label: 'LSD' },
  { value: 'other', label: 'Other' },
]

const psilocybinFormOptions: { value: PsilocybinForm; label: string }[] = [
  { value: 'fresh', label: 'Fresh mushrooms' },
  { value: 'dried', label: 'Dried mushrooms' },
  { value: 'ground', label: 'Ground (powder)' },
  { value: 'capsule', label: 'Capsules' },
  { value: 'chocolate', label: 'Chocolate' },
  { value: 'edible', label: 'Edibles' },
  { value: 'tea', label: 'Tea / Brew' },
  { value: 'other', label: 'Other' },
]

const lsdFormOptions: { value: LSDForm; label: string }[] = [
  { value: 'paper', label: 'Paper (blotter)' },
  { value: 'liquid', label: 'Liquid (drops)' },
  { value: 'gel', label: 'Gel tabs' },
  { value: 'capsule', label: 'Capsules' },
  { value: 'other', label: 'Other' },
]

const otherFormOptions = [
  { value: 'whole', label: 'Whole' },
  { value: 'ground', label: 'Ground (powder)' },
  { value: 'capsule', label: 'Capsules' },
  { value: 'liquid', label: 'Liquid' },
  { value: 'edible', label: 'Edible' },
  { value: 'other', label: 'Other' },
]

const potencyOptions = [
  { value: '', label: 'Select potency' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'unknown', label: 'Unknown' },
]

const unitOptions = [
  { value: 'mg', label: 'mg (milligrams)' },
  { value: 'ug', label: 'μg (micrograms)' },
]

export default function BatchForm({ initialData, onSubmit, onCancel, isSubmitting }: BatchFormProps) {
  const [name, setName] = useState(initialData?.name ?? '')
  const [substanceType, setSubstanceType] = useState<string>(initialData?.substance_type ?? '')
  const [form, setForm] = useState<string>(initialData?.form ?? '')
  const [potency, setPotency] = useState<string>(initialData?.estimated_potency ?? '')
  const [doseUnit, setDoseUnit] = useState<DoseUnit>(initialData?.dose_unit ?? 'mg')
  const [supplements, setSupplements] = useState(initialData?.supplements ?? '')
  const [sourceNotes, setSourceNotes] = useState(initialData?.source_notes ?? '')

  const getFormOptions = () => {
    switch (substanceType) {
      case 'psilocybin':
        return psilocybinFormOptions
      case 'lsd':
        return lsdFormOptions
      default:
        return otherFormOptions
    }
  }

  const handleSubstanceChange = (value: string) => {
    setSubstanceType(value)
    setForm('')
    setDoseUnit(value === 'lsd' ? 'ug' : 'mg')
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !substanceType || !form || !potency) return
    onSubmit({
      name: name.trim(),
      substance_type: substanceType as SubstanceType,
      form: form as BatchFormType,
      estimated_potency: potency as EstimatedPotency,
      dose_unit: doseUnit,
      supplements: supplements.trim(),
      source_notes: sourceNotes.trim(),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Batch Name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g., Golden Teachers - Harvest 1"
        required
      />

      <Select
        label="Substance"
        value={substanceType}
        onChange={(e) => handleSubstanceChange(e.target.value)}
        options={substanceTypeOptions}
      />

      <Select
        label="Form"
        value={form}
        onChange={(e) => setForm(e.target.value)}
        options={[
          { value: '', label: substanceType ? 'Select form' : 'Select substance first' },
          ...getFormOptions().map(opt => ({ value: opt.value, label: opt.label }))
        ]}
      />

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Potency"
          value={potency}
          onChange={(e) => setPotency(e.target.value)}
          options={potencyOptions}
        />

        <Select
          label="Dose Unit"
          value={doseUnit}
          onChange={(e) => setDoseUnit(e.target.value as DoseUnit)}
          options={unitOptions}
        />
      </div>

      <Input
        label="Supplements (Optional)"
        type="text"
        value={supplements}
        onChange={(e) => setSupplements(e.target.value)}
        placeholder="e.g., Lions Mane, B-12, Omega-3"
      />

      <label className="block">
        <span className="font-mono text-xs tracking-wider uppercase text-bone mb-2 block">
          Source Notes (Optional)
        </span>
        <textarea
          value={sourceNotes}
          onChange={(e) => setSourceNotes(e.target.value)}
          rows={3}
          className="w-full rounded-button border border-ember/30 bg-elevated px-4 py-3 text-ivory placeholder:text-ash focus:border-orange focus:outline-none transition-quick"
          placeholder="Any details about the batch source or preparation."
        />
      </label>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={isSubmitting}>
          {initialData?.name ? 'Update Batch' : 'Create Batch'}
        </Button>
      </div>
    </form>
  )
}
