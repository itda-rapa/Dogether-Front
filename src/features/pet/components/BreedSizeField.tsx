import { useId, useRef, useState } from 'react'
import { Field } from '@/components/ui/Field'
import { inputClass } from '@/components/ui/input-class'
import { cn } from '@/lib/cn'
import {
  findBreedEntry,
  searchBreeds,
  sizeFromWeight,
  type BreedSizeEntry,
} from '@/features/pet/breedSizeData'
import { SIZE_LABEL, type PetSize } from '@/features/pet/types'

type Props = {
  breedName: string
  weightKg: string
  sizeCode: string
  onBreedNameChange: (value: string) => void
  onWeightKgChange: (value: string) => void
  onSizeCodeChange: (value: string) => void
  breedError?: string
}

const SIZE_OPTIONS: { value: PetSize; label: string }[] = (
  Object.entries(SIZE_LABEL) as [Exclude<PetSize, null>, string][]
).map(([value, label]) => ({ value, label }))

const TICK_STEPS = [0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100]

/**
 * 슬라이더 아래 눈금. 폭에 맞는 "예쁜" 간격을 골라 min 부터 고르게 채운다.
 * max 를 억지로 눈금에 끼워넣지 않는다 — 끝수가 간격에 안 맞으면 마지막
 * 칸만 짧아져서 눈금이 삐뚤빼뚤해 보인다.
 */
function niceTicks(min: number, max: number, targetCount = 7): number[] {
  const span = max - min
  if (span <= 0) return [min]
  const step =
    TICK_STEPS.find((s) => span / s <= targetCount) ?? TICK_STEPS[TICK_STEPS.length - 1]
  const ticks: number[] = []
  for (let v = min; v <= max + 1e-9; v += step) {
    ticks.push(Math.round(v * 10) / 10)
  }
  return ticks
}

/**
 * 견종 검색 + 크기·몸무게 추천 필드.
 *
 * 백엔드 API 계약이 아직 없어 breedSizeData.ts 더미 테이블로 동작한다
 * (memory: project_dog_breed_size_recommendation). 입력값은 기존
 * PetWriteBody 의 breedName/weightKg/sizeCode 그대로라 계약이 나오면
 * 이 테이블만 서버 응답으로 바꿔치기하면 된다.
 */
export function BreedSizeField({
  breedName,
  weightKg,
  sizeCode,
  onBreedNameChange,
  onWeightKgChange,
  onSizeCodeChange,
  breedError,
}: Props) {
  const [open, setOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const blurTimer = useRef<number>(undefined)
  const listboxId = useId()

  const matched = findBreedEntry(breedName)
  const isRangeBound =
    matched && matched.minWeight != null && matched.maxWeight != null

  const options = searchBreeds(breedName)

  // 일반적인 견종 범위를 슬라이더 기본 폭으로 쓰되, 그보다 무겁거나
  // 가벼운 개체(예: 유난히 큰 세인트버나드)를 입력하면 슬라이더 폭을
  // 그 값까지 넓혀서 따라가게 한다. 절대 자르지 않는다.
  const weightNum = weightKg === '' ? undefined : Number(weightKg)
  const hasValidWeightNum = weightNum !== undefined && !Number.isNaN(weightNum)
  const sliderMin =
    isRangeBound && matched.minWeight != null
      ? Math.max(0, hasValidWeightNum ? Math.min(matched.minWeight, weightNum) : matched.minWeight)
      : 0
  const sliderMax =
    isRangeBound && matched.maxWeight != null
      ? hasValidWeightNum
        ? Math.max(matched.maxWeight, weightNum)
        : matched.maxWeight
      : 0

  const applyWeight = (value: string) => {
    onWeightKgChange(value)
    const n = Number(value)
    if (value !== '' && !Number.isNaN(n)) {
      onSizeCodeChange(sizeFromWeight(n) ?? '')
    }
  }

  const selectBreed = (entry: BreedSizeEntry) => {
    onBreedNameChange(entry.breed)
    setOpen(false)
    if (entry.avgWeight != null) {
      applyWeight(String(entry.avgWeight))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Field label="품종" error={breedError}>
        {({ id, describedBy, invalid }) => (
          <div className="relative">
            <input
              id={id}
              type="text"
              role="combobox"
              autoComplete="off"
              placeholder="예: 시바, 보더"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              aria-expanded={open}
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={
                open && options[highlightedIndex] ? `${listboxId}-${highlightedIndex}` : undefined
              }
              className={inputClass(invalid)}
              value={breedName}
              onChange={(e) => {
                onBreedNameChange(e.target.value)
                setOpen(true)
                setHighlightedIndex(0)
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => {
                blurTimer.current = window.setTimeout(() => setOpen(false), 120)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setOpen(false)
                  return
                }
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setOpen(true)
                  setHighlightedIndex((i) => Math.min(options.length - 1, i + 1))
                  return
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setOpen(true)
                  setHighlightedIndex((i) => Math.max(0, i - 1))
                  return
                }
                if (e.key === 'Enter') {
                  // 폼 안의 텍스트 인풋이라 막지 않으면 Enter 가 등록 폼을 통째로 제출해버린다.
                  e.preventDefault()
                  if (open && options[highlightedIndex]) {
                    selectBreed(options[highlightedIndex])
                  } else {
                    setOpen(false)
                  }
                }
              }}
            />

            {open && options.length > 0 && (
              <ul
                id={listboxId}
                role="listbox"
                className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border bg-surface shadow-lg"
              >
                {options.map((entry, index) => (
                  <li key={entry.breed}>
                    <button
                      id={`${listboxId}-${index}`}
                      type="button"
                      role="option"
                      aria-selected={index === highlightedIndex}
                      className={cn(
                        'flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-[14px]',
                        index === highlightedIndex ? 'bg-primary-subtle' : 'hover:bg-primary-subtle',
                      )}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        window.clearTimeout(blurTimer.current)
                        selectBreed(entry)
                      }}
                    >
                      <span>{entry.breed}</span>
                      <span className="text-[12px] text-muted-foreground">
                        {entry.minWeight != null && entry.maxWeight != null
                          ? `${entry.minWeight}~${entry.maxWeight}kg`
                          : '무게 직접 입력'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Field>

      <Field
        label="몸무게"
        hint={
          isRangeBound
            ? `${matched.minWeight}~${matched.maxWeight}kg 이 일반적인 범위입니다 (평균 ${matched.avgWeight}kg) · 그보다 크거나 작아도 자유롭게 입력하세요`
            : 'kg · 목록에 없는 견종이면 실제 몸무게를 직접 입력해 주세요'
        }
      >
        {({ id }) =>
          isRangeBound ? (
            <div className="flex flex-col gap-2">
              <input
                type="range"
                min={sliderMin}
                max={sliderMax}
                step={0.1}
                value={weightKg || String(matched.avgWeight ?? matched.minWeight)}
                onChange={(e) => applyWeight(e.target.value)}
                className="w-full accent-primary"
              />
              <div className="relative h-7">
                {niceTicks(sliderMin, sliderMax).map((t) => (
                  <div
                    key={t}
                    className="absolute flex -translate-x-1/2 flex-col items-center"
                    style={{ left: `${((t - sliderMin) / (sliderMax - sliderMin)) * 100}%` }}
                  >
                    <span className="h-1.5 w-px bg-border" />
                    <span className="mt-0.5 whitespace-nowrap text-[11px] text-muted-foreground">
                      {Number.isInteger(t) ? t : t.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  id={id}
                  type="number"
                  step="0.1"
                  min="0"
                  inputMode="decimal"
                  className={cn(inputClass(false), 'max-w-32')}
                  value={weightKg}
                  onChange={(e) => applyWeight(e.target.value)}
                />
                <span className="text-[14px] text-muted-foreground">kg</span>
              </div>
            </div>
          ) : (
            <input
              id={id}
              type="number"
              step="0.01"
              min="0"
              max="999.99"
              inputMode="decimal"
              placeholder="예: 12.5"
              className={inputClass(false)}
              value={weightKg}
              onChange={(e) => applyWeight(e.target.value)}
            />
          )
        }
      </Field>

      <Field label="크기" aiFilled={Boolean(weightKg)} filledLabel="자동 계산">
        {({ id }) => (
          <select
            id={id}
            className={inputClass(false)}
            value={sizeCode}
            onChange={(e) => onSizeCodeChange(e.target.value)}
          >
            <option value="">선택 안 함</option>
            {SIZE_OPTIONS.map((s) => (
              <option key={s.value} value={s.value ?? ''}>
                {s.label}
              </option>
            ))}
          </select>
        )}
      </Field>
    </div>
  )
}
