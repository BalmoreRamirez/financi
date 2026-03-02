export const unifiedSelectPt = {
  root: { class: '!bg-primary/10 !border-primary/30' },
  label: { class: '!text-ink' },
  dropdown: { class: '!text-ink/70' },
  overlay: { class: '!bg-white !border !border-primary/20' },
  option: ({ context }: any) => ({
    class: [
      '!text-ink',
      context?.selected ? '!bg-primary/20 !text-ink font-medium' : 'hover:!bg-primary/10'
    ]
  })
}