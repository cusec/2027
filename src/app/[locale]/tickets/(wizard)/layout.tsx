import WizardStepNav from "@/app/components/TicketWizard/WizardStepNav";

export default function TicketWizardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="wizard-wrapper">
      <WizardStepNav />
      {children}
    </div>
  );
}
