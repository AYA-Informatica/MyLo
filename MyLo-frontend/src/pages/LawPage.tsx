import type { LawDetails } from '../types/lawtypes';
import GeneralNav from '../components/GeneralNav';
import Button from '../components/Button';

const law: LawDetails = {
  id: '32-2016',
  lawNumber: 'Law No. 32 of 2016 of 28/08/2016',
  title: 'Governing Person and family',
  description: 'Related to the marriage, family relation, children and adoption',
  articles: [
    {
      title: 'Article 1: Marriage Principle',
      content:
        'Spouses are considered equal partners within the marriage and are endowed with the same rights and responsibilities. These principles include mutual respect, fidelity, cooperation in decision-making, and support in both personal and financial matters. Each spouse must assist the other in times of need, ensuring that the relationship is built on fairness, trust, and partnership. The law emphasizes that marriage should be founded on equality and the well-being of both partners.',
    },
    {
      title: 'Article 2: household Duties',
      content:
        'Both spouses are jointly responsible for the moral, emotional, and material welfare of the household. This includes providing financial support, participating in child-rearing, managing daily responsibilities, and ensuring a harmonious family environment. If one spouse neglects their duties, the court may intervene to safeguard the rights and welfare of children or the vulnerable spouse. Household responsibilities are not limited to income provision but also extend to domestic care, guidance, and education of children.',
    },
    {
      title: 'Article 3: Divorce Grounds',
      content:
        'The law clearly outlines the grounds under which a marriage can be dissolved through divorce. These include adultery, abandonment or desertion for at least twelve months, acts of abuse or cruelty, and gender-based violence. The law also addresses situations of persistent disagreement, incompatibility, or serious misconduct that undermine the marital bond. Divorce proceedings consider not only the rights of spouses but also the welfare of children, ensuring custody, maintenance, and protection are prioritized.',
    },
    {
      title: 'Article 4: Children Adoption',
      content:
        'This article establishes the rights and responsibilities related to children, including biological children and those under adoption. It highlights parental obligations to provide care, guidance, and protection, as well as the state’s role in protecting the principle of parental care. Adoption is regulated to ensure that children are placed in safe and nurturing families, with proper oversight of adoptive parents. The law has updated the 1968 family law and was amended in 2020 to strengthen child protection measures, safeguard against exploitation, and promote children’s welfare through adoption.',
    },
  ],
  aiSummary:
    'Law No. 32/2016 governs family relations in Rwanda by ensuring equal rights for spouses, regulating household duties, and protecting children. It defines divorce grounds such as adultery, desertion, abuse, or violence, while safeguarding adoption processes and strengthening family welfare and justice.',
};

export default function LawPage() {
  return (
    <div className="bg-[color:var(--color-style-500)] min-h-screen">
      <GeneralNav />
      <div className="pt-20 max-w-2xl mx-auto px-2 sm:px-0">
        <div className="text-sm text-gray-500 mb-4 mt-2">
          Gazette <span className="mx-1">/</span>
          <span className="text-primary-800 font-medium">Law Details</span>
        </div>
        <div className="bg-white rounded-xl shadow p-5 sm:p-8 mb-8">
          <div className="font-bold text-[1rem] sm:text-lg text-primary-800 mb-2">
            {law.lawNumber} {law.title}
          </div>
          <div className="text-gray-600 mb-4 text-sm">{law.description}</div>
          <div className="flex items-center mb-4">
            <div className="ml-auto">

            </div>
          </div>
          <div className="space-y-4 text-[0.97rem] text-gray-700">
            {law.articles.map((article, idx) => (
              <div key={idx}>
                <span className="font-semibold text-primary-800">{article.title}</span>
                <div>{article.content}</div>
              </div>
            ))}
          </div>
          {/* AI Generated summary */}
          <div className="mt-8">
            <div className="font-semibold text-primary-800 mb-2">AI Generated summary</div>
            <div className="bg-[color:var(--color-style-500)] border border-primary-100 rounded-lg p-4 text-gray-700 text-sm mb-4">
              {law.aiSummary}
            </div>
            <Button
              className="bg-primary-800 text-white px-6 py-2 rounded-full text-sm font-semibold shadow hover:bg-primary-700 transition"
              onClick={() => {
                // handle click here
                window.location.href = '/ai';
              }}
            >
              Ask Lobot about this Law
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
