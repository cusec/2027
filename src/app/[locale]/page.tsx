import V2Nav from "@/app/components/v2/Nav/V2Nav";
import V2Scrollbar from "@/app/components/v2/Scrollbar/V2Scrollbar";
import V2ScrollReveal from "@/app/components/v2/Reveal/V2ScrollReveal";
import V2Hero from "@/app/components/v2/Hero/V2Hero";
import V2Sky from "@/app/components/v2/Sky/V2Sky";
import V2Dawn from "@/app/components/v2/Dawn/V2Dawn";
import V2Archive from "@/app/components/v2/Archive/V2Archive";
import V2Hunt from "@/app/components/v2/Hunt/V2Hunt";
import V2Passes from "@/app/components/v2/Passes/V2Passes";
import V2Sponsors from "@/app/components/v2/Sponsors/V2Sponsors";
import V2Faq from "@/app/components/v2/Faq/V2Faq";
import V2Closing from "@/app/components/v2/Closing/V2Closing";
import V2Footer from "@/app/components/v2/Footer/V2Footer";

export default function HomePage() {
	return (
		<div className="v2">
			<link
				rel="preload"
				as="image"
				href="/assets/v2/background-unified.webp"
				type="image/webp"
				fetchPriority="high"
			/>
			<V2Nav />
			<V2Scrollbar />
			<V2ScrollReveal />
			<noscript>
				<style>{`.v2-reveal{opacity:1!important;translate:none!important}`}</style>
			</noscript>
			<div className="v2-scene">
				<img
					className="v2-scene__backdrop"
					src="/assets/v2/background-unified.webp"
					alt=""
					width={2560}
					height={12360}
					fetchPriority="high"
					aria-hidden="true"
				/>
				<V2Hero />
				<V2Sky />
				<V2Dawn />
				<V2Archive />
				<V2Hunt />
				<V2Passes />
				<V2Sponsors />
				<V2Faq />
				<V2Closing />
			</div>
			<V2Footer />
		</div>
	);
}
