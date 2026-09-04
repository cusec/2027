"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Globe, ChevronDown, Check } from "lucide-react";

const LOCALES = ["en-CA", "fr-CA"] as const;

const SHORT: Record<string, string> = {
	"en-CA": "EN",
	"fr-CA": "FR",
};

// Endonyms — each language names itself, so these are deliberately not
// translated and don't live in messages/.
const NAME: Record<string, string> = {
	"en-CA": "English",
	"fr-CA": "Français",
};

/**
 * Locale is resolved from the Accept-Language header / cookie (localePrefix is
 * 'never'), so this control is the only way for a visitor to switch language.
 *
 * This is a hand-rolled listbox rather than a <select>. It used to be a native
 * select stretched invisibly over the pill, but a select's popup is drawn by
 * the OS and cannot be styled — no radius, no glass, no brand colours — so the
 * menu was the one piece of the navbar that ignored the design. The cost is
 * that the keyboard and ARIA behaviour a select gives for free has to be
 * implemented here: see the key handlers below.
 */
export default function V2LocaleSwitcher({ label }: { label: string }) {
	const locale = useLocale();
	const pathname = usePathname();
	const router = useRouter();

	const [open, setOpen] = useState(false);
	const [activeIndex, setActiveIndex] = useState(0);

	const rootRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const optionRefs = useRef<(HTMLLIElement | null)[]>([]);

	const select = (value: string) => {
		setOpen(false);
		triggerRef.current?.focus();
		if (value !== locale) router.replace(pathname, { locale: value });
	};

	const openWith = (index: number) => {
		setActiveIndex(index);
		setOpen(true);
	};

	// Move DOM focus onto the active option so screen readers follow the
	// selection and Escape/Tab behave the way a real listbox does.
	useEffect(() => {
		if (open) optionRefs.current[activeIndex]?.focus();
	}, [open, activeIndex]);

	useEffect(() => {
		if (!open) return;

		const onPointerDown = (e: PointerEvent) => {
			if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
		};

		document.addEventListener("pointerdown", onPointerDown);
		return () => document.removeEventListener("pointerdown", onPointerDown);
	}, [open]);

	const currentIndex = Math.max(
		0,
		LOCALES.findIndex((l) => l === locale)
	);

	const onTriggerKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			openWith(currentIndex);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			openWith(LOCALES.length - 1);
		}
	};

	const onOptionKeyDown = (e: React.KeyboardEvent, index: number) => {
		switch (e.key) {
			case "ArrowDown":
				e.preventDefault();
				setActiveIndex((index + 1) % LOCALES.length);
				break;
			case "ArrowUp":
				e.preventDefault();
				setActiveIndex((index - 1 + LOCALES.length) % LOCALES.length);
				break;
			case "Home":
				e.preventDefault();
				setActiveIndex(0);
				break;
			case "End":
				e.preventDefault();
				setActiveIndex(LOCALES.length - 1);
				break;
			case "Enter":
			case " ":
				e.preventDefault();
				select(LOCALES[index]);
				break;
			case "Escape":
				e.preventDefault();
				setOpen(false);
				triggerRef.current?.focus();
				break;
			case "Tab":
				// let focus leave naturally, just don't strand an open menu
				setOpen(false);
				break;
		}
	};

	return (
		<div className={`v2-locale${open ? " is-open" : ""}`} ref={rootRef}>
			<button
				type="button"
				className="v2-locale__trigger"
				ref={triggerRef}
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-label={label}
				onClick={() => (open ? setOpen(false) : openWith(currentIndex))}
				onKeyDown={onTriggerKeyDown}
			>
				<Globe size={16} strokeWidth={1.9} aria-hidden="true" />
				<span className="v2-locale__value">{SHORT[locale] ?? locale}</span>
				<ChevronDown
					className="v2-locale__chev"
					size={13}
					strokeWidth={2.2}
					aria-hidden="true"
				/>
			</button>

			{open && (
				<ul className="v2-locale__menu" role="listbox" aria-label={label}>
					{LOCALES.map((value, i) => (
						<li
							key={value}
							role="option"
							aria-selected={value === locale}
							tabIndex={-1}
							ref={(el) => {
								optionRefs.current[i] = el;
							}}
							className={`v2-locale__option${
								value === locale ? " is-current" : ""
							}`}
							onClick={() => select(value)}
							onKeyDown={(e) => onOptionKeyDown(e, i)}
							onMouseEnter={() => setActiveIndex(i)}
						>
							<span className="v2-locale__option-code">{SHORT[value]}</span>
							<span className="v2-locale__option-name">{NAME[value]}</span>
							{value === locale && (
								<Check size={14} strokeWidth={2.6} aria-hidden="true" />
							)}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
