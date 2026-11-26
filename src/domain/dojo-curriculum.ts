/**
 * StopBucks Dojo Research Curriculum
 * Canonical, pure TypeScript definition of all 3 Worlds and 9 Progressive Levels.
 * Grounded strictly in verified behavioral-finance research findings.
 */

import type {
  DojoLevel,
  DojoLevelId,
  DojoWorld,
  DojoWorldId,
} from "./dojo-types";

export const DOJO_WORLDS: readonly DojoWorld[] = [
  {
    id: "world-1",
    worldNumber: 1,
    title: "The Impulse Mind",
    subtitle: "Spotting the invisible scripts behind every tap.",
    themeAccent: "amber",
  },
  {
    id: "world-2",
    worldNumber: 2,
    title: "Mental Buckets & Framing",
    subtitle: "Rewiring how you label deals, petty cash, and growth.",
    themeAccent: "sky",
  },
  {
    id: "world-3",
    worldNumber: 3,
    title: "Resilience & Commitment",
    subtitle:
      "Transitioning to financial independence with buffers and commitment devices.",
    themeAccent: "emerald",
  },
] as const;

export const DOJO_LEVELS: readonly DojoLevel[] = [
  // =========================================================================
  // WORLD 1 — THE IMPULSE MIND
  // =========================================================================
  {
    id: 1,
    worldId: "world-1",
    slug: "money-scripts-planners-shield",
    title: "Money Scripts & The Planner's Shield",
    subtitle:
      "Outsmarting your fast-acting Doer self with small deliberative pauses.",
    isBoss: false,
    estimatedSeconds: 180,
    baseXp: 100,
    perfectBonusXp: 20,
    badgeId: "planners_shield",
    badgeName: "Planner's Shield",
    badgeDescription:
      "Distinguished inherited money scripts from deliberate Planner decisions.",
    badgeIcon: "shield",
    citation: {
      authors: "Strömbäck, Lind, Skagerlund, Västfjäll & Tinghög",
      year: 2017,
      title:
        "Does self-control predict financial behavior and financial well-being?",
      journal: "Journal of Behavioral and Experimental Finance, 14, 30–38",
      sampleSummary: "Representative Swedish adult sample (n = 2,063, aged 20–75)",
      keyFinding:
        "High self-control respondents scored higher on the Financial Management Behavioral Scale (3.61 vs. 3.27, p < 0.001), reported lower financial anxiety (2.57 vs. 3.05, p < 0.001), and felt greater financial security (3.27 vs. 2.78, p < 0.001). Both self-control and deliberative thinking positively predicted sound financial behavior alongside financial literacy.",
    },
    secondaryCitation: {
      authors: "Shim, Barber, Card, Xiao & Serido",
      year: 2010,
      title:
        "Financial socialization of first-year college students: The roles of parents, work, and education",
      journal: "Journal of Youth and Adolescence, 39(12), 1457–1470",
      sampleSummary:
        "2,098 first-year college students from the APLUS longitudinal study",
      keyFinding:
        "Supported a four-stage socialization chain from early parent/work/school exposure to financial learning, attitudes, perceived control, and healthy financial behavior; parental socialization outweighed part-time work and high school education combined.",
    },
    wager: {
      prompt:
        "In Strömbäck et al. (2017), how did adults with higher self-control compare to those with lower self-control on everyday financial management (FMBS, 1–5 scale) and financial anxiety?",
      options: [
        "They scored higher on management (3.61 vs. 3.27) and lower on financial anxiety (2.57 vs. 3.05).",
        "They showed identical financial anxiety, because income alone determines stress.",
        "Only financial literacy mattered; self-control had zero association with behavior.",
        "Higher self-control lowered enjoyment and made financial anxiety worse.",
      ],
      correctIndex: 0,
      comparisonBars: [
        {
          label: "High Self-Control FMBS",
          value: 3.61,
          displayValue: "3.61 / 5",
          highlight: true,
        },
        {
          label: "Low Self-Control FMBS",
          value: 3.27,
          displayValue: "3.27 / 5",
        },
        {
          label: "High Self-Control Anxiety",
          value: 2.57,
          displayValue: "2.57 / 5",
          highlight: true,
        },
        {
          label: "Low Self-Control Anxiety",
          value: 3.05,
          displayValue: "3.05 / 5",
        },
      ],
      revealExplanation:
        "Extending Shefrin & Thaler's Behavioral Life-Cycle (Planner vs. Doer) model, Strömbäck et al. (2017) found that self-control (B = 0.235, p < 0.01) and deliberative thinking (B = 0.144, p < 0.01) both positively predicted healthy financial behavior even after controlling for financial literacy and income.",
    },
    mechanic: {
      kind: "impulse_duel",
      scenario:
        "Round 1 — Convenience vs. Plan: It is raining after your 5 PM lab. A food app offers 20-minute delivery with a ₹95 surge and packaging fee, even though your prepaid mess dinner is open in 15 minutes.",
      system1Excuse:
        "My convenience comes first today—one delivery fee won't change my month.",
      choices: [
        {
          label:
            "Pause for 30 seconds, check today's remaining runway, and walk to the mess or eat stocked hostel snacks.",
          isDeliberative: true,
          feedback:
            "Deliberative Planner move: Strömbäck et al. (2017) measured convenience-first decision making ('My convenience plays an important role in the decisions I make', mean 3.25) as a direct drag on self-control. Routing around surge convenience protects tomorrow's comfort.",
        },
        {
          label:
            "Order immediately with 1-tap UPI because waiting 15 minutes feels annoying.",
          isDeliberative: false,
          feedback:
            "Doer shortcut: Paying extra for repeated frictionless convenience silently shrinks your daily runway without adding nutritional value.",
        },
      ],
      rounds: [
        {
          scenario:
            "Round 1 — Convenience vs. Plan: It is raining after your 5 PM lab. A food app offers 20-minute delivery with a ₹95 surge and packaging fee, even though your prepaid mess dinner is open in 15 minutes.",
          system1Excuse:
            "My convenience comes first today—one delivery fee won't change my month.",
          choices: [
            {
              label:
                "Pause for 30 seconds, check today's remaining runway, and walk to the mess or eat stocked hostel snacks.",
              isDeliberative: true,
              feedback:
                "Deliberative Planner move: Strömbäck et al. (2017) measured convenience-first decision making ('My convenience plays an important role in the decisions I make', mean 3.25) as a direct drag on self-control. Routing around surge convenience protects tomorrow's comfort.",
            },
            {
              label:
                "Order immediately with 1-tap UPI because waiting 15 minutes feels annoying.",
              isDeliberative: false,
              feedback:
                "Doer shortcut: Paying extra for repeated frictionless convenience silently shrinks your daily runway without adding nutritional value.",
            },
          ],
        },
        {
          scenario:
            "Round 2 — Comparison Skip: Between lectures, you spot a sleek desk lamp on a social ad for ₹1,499 with a '4 hours left' countdown timer.",
          system1Excuse:
            "I need better lighting anyway—no time to compare prices or sleep on it.",
          choices: [
            {
              label:
                "Park it in the 48-Hour Vault and check campus resale/local stores before deciding.",
              isDeliberative: true,
              feedback:
                "Sharp comparison habit: Acting without thinking through alternatives was a core item in Strömbäck et al.'s self-control scale, while comparison shopping sits at the top of the FMBS (mean 3.86).",
            },
            {
              label:
                "Buy now before the countdown expires so you don't miss out.",
              isDeliberative: false,
              feedback:
                "Artificial urgency hijacks your Doer self and skips alternative checking—the exact opposite of deliberative financial behavior.",
            },
          ],
        },
        {
          scenario:
            "Round 3 — Inherited Money Scripts: Friends say 'Everyone overspends in college—you'll fix your budget once you graduate and get a salary.'",
          system1Excuse:
            "College money habits don't matter yet; real budgeting starts after graduation.",
          choices: [
            {
              label:
                "Keep small weekly limits and build perceived control now—knowing college habits carry into adulthood.",
              isDeliberative: true,
              feedback:
                "Perceived control win: Shim et al. (2010) showed in 2,098 first-year students that early money scripts and perceived behavioral control predict healthier behaviors, higher satisfaction, and lower debt.",
            },
            {
              label:
                "Ignore your monthly cap this semester and assume future income will wipe the slate clean.",
              isDeliberative: false,
              feedback:
                "Waiting for a future paycheck skips building perceived control today—the exact trait Shim et al. (2010) linked to lower debt accumulation.",
            },
          ],
        },
      ],
    },
    masteryQuestions: [
      {
        prompt:
          "In the Behavioral Life-Cycle view extended by Strömbäck et al. (2017), what is financial self-control?",
        options: [
          "The ability of your long-term 'Planner' self to regulate impulses of your present-focused 'Doer' self.",
          "Memorizing tax brackets and compound-interest formulas without changing habits.",
          "Never spending money on social life, hobbies, or convenience under any circumstance.",
        ],
        correctIndex: 0,
        explanation:
          "Self-control is framed as your future-oriented Planner regulating your current-self Doer—using concrete pauses and rules rather than shame or deprivation.",
      },
      {
        prompt:
          "What did Shim et al. (2010) find in their four-stage study of 2,098 first-year college students?",
        options: [
          "Early financial socialization (especially parents), learning, attitudes, and perceived control form a chain leading to healthier behaviors and lower debt.",
          "Part-time job income alone automatically prevents student debt without attitudes or control.",
          "College students cannot build perceived financial control until after graduation.",
        ],
        correctIndex: 0,
        explanation:
          "Shim et al. (2010) found that early socialization shapes knowledge, attitudes, and perceived control, which in turn predict healthy financial behaviors and satisfaction.",
      },
      {
        prompt:
          "Which non-cognitive trait in Strömbäck et al. (2017) positively predicted both paycheck saving and general FMBS behavior alongside self-control?",
        options: [
          "Deliberative thinking (making plans and analyzing options before acting).",
          "Extreme over-optimism that bills will sort themselves out.",
          "Avoiding looking at account balances altogether.",
        ],
        correctIndex: 0,
        explanation:
          "Deliberative thinking positively predicted savings (B = 0.143) and FMBS (B = 0.144), whereas prior literature noted extreme optimism can lead to poor financial choices.",
      },
    ],
  },

  {
    id: 2,
    worldId: "world-1",
    slug: "red-black-numb-tap",
    title: "The Red, The Black & The Numb Tap",
    subtitle:
      "Why cash hurts, UPI fades, and small recurring taps sneak under the radar.",
    isBoss: false,
    estimatedSeconds: 200,
    baseXp: 110,
    perfectBonusXp: 25,
    badgeId: "pain_master",
    badgeName: "Coupling Decoder",
    badgeDescription:
      "Decoded how payment coupling changes the psychological visibility of spending.",
    badgeIcon: "credit-card",
    citation: {
      authors: "Prelec & Loewenstein",
      year: 1998,
      title: "The Red and the Black: Mental Accounting of Savings and Debt",
      journal: "Marketing Science, 17(1), 4–28",
      sampleSummary:
        "Theoretical double-entry mental accounting model tested via empirical choice/conjoint evaluation",
      keyFinding:
        "Double-entry mental accounting (hedonic coupling between pleasure of consumption and pain of paying) fit choices better than standard time discounting for 60% of subjects vs. 29%. Weakening coupling (cards, delayed payments, flat rates) reduces pain salience during consumption.",
    },
    wager: {
      prompt:
        "When Prelec & Loewenstein (1998) pitted their double-entry mental accounting model against standard economic time discounting, which model better explained subjects' choices?",
      options: [
        "Double-entry mental accounting fit 60% of subjects best, versus 29% for standard discounting.",
        "Standard time discounting fit 80% of subjects because payment timing never affects enjoyment.",
        "Both models performed identically at 50% each.",
        "Subjects always preferred paying after consumption rather than prepaying.",
      ],
      correctIndex: 0,
      comparisonBars: [
        {
          label: "Double-Entry Model Fit",
          value: 60,
          displayValue: "60% of subjects",
          highlight: true,
        },
        {
          label: "Standard Discounting Fit",
          value: 29,
          displayValue: "29% of subjects",
        },
      ],
      revealExplanation:
        "Because thoughts of payment dampen consumption enjoyment ('pain of paying'), 60% of subjects aligned better with Prelec & Loewenstein's double-entry model than standard discounting (29%)—explaining why people love prepaying for vacations ('feels free' while there) and hate post-trip bills.",
    },
    mechanic: {
      kind: "interactive_slider",
      sliderLabel: "Payment Mode Coupling Spectrum",
      min: 0,
      max: 2,
      step: 1,
      defaultValue: 2,
      unit: "mode",
      presetKey: "coupling_meter",
      challengePrompt:
        "Slide from Flat-Rate/BNPL (2) to Cash (0) to see how tighter coupling restores payment visibility and reduces mindless micro-taps.",
      targetRange: { min: 0, max: 0 },
      insightText:
        "Note: StopBucks's coupling meter uses an illustrative 0–100 scale based on Prelec & Loewenstein's qualitative hierarchy—Cash creates tight immediate salience, UPI/Card softens it, and Flat-Rate/BNPL decouples payment from the moment of consumption.",
    },
    masteryQuestions: [
      {
        prompt:
          "Why do people often prefer prepaying for a semester trip or vacation instead of paying afterward?",
        options: [
          "Prepayment decouples the pain of paying from the trip so consumption can be enjoyed 'as if free', avoiding a painful post-trip bill.",
          "Prepaying earns higher interest than keeping money in a bank.",
          "Standard time discounting predicts people always prefer paying earlier.",
        ],
        correctIndex: 0,
        explanation:
          "Under double-entry mental accounting, prepaying writes off the cost beforehand, preventing payment thoughts from spoiling the experience and avoiding a post-consumption 'hedonic plunge'.",
      },
      {
        prompt:
          "Why are ₹45 UPI coffee taps and ₹29 app renewals harder to notice than handing over a ₹500 cash note?",
        options: [
          "Digital decoupling and scale mismatch lower immediate pain salience—tiny taps feel nearly zero individually until summed across a month.",
          "UPI transactions literally charge zero money to your bank balance.",
          "Cashless spending is always an Invest-in-Self category.",
        ],
        correctIndex: 0,
        explanation:
          "Weakly coupled payment methods blur the red-ink pain of paying, letting micro-transactions accumulate unnoticed.",
      },
      {
        prompt:
          "For a durable item you use all semester (like study headphones or a bike), why does Prelec & Loewenstein's model treat payment timing differently from a one-night concert?",
        options: [
          "Durables deliver utility over months, so aligning payments with ongoing usage reduces the feeling of paying for 'nothing left'.",
          "Durables never create any pain of paying regardless of price.",
          "Concerts always cost more than durables.",
        ],
        correctIndex: 0,
        explanation:
          "When consumption is transient (a concert or vacation), paying afterward hurts because the pleasure is already gone; durables keep delivering benefits alongside payments.",
      },
    ],
  },

  {
    id: 3,
    worldId: "world-1",
    slug: "boss-frictionless-trap",
    title: "The Frictionless Trap",
    subtitle:
      "World 1 Boss: Why late-night stress bypasses math—and how friction plus self-efficacy breaks the loop.",
    isBoss: true,
    estimatedSeconds: 240,
    baseXp: 150,
    perfectBonusXp: 30,
    badgeId: "friction_architect",
    badgeName: "Friction Architect",
    badgeDescription:
      "Defeated the 11:45 PM BNPL boss using cooling-off friction, self-efficacy, and self-compassion.",
    badgeIcon: "flame",
    citation: {
      authors: "Ma, Ge, Gu & Ding",
      year: 2026,
      title:
        "The psychology of digital credit: the association of financial anxiety and impulsive traits with 'buy now, pay later' delinquency",
      journal: "Frontiers in Psychology, 17:1950938",
      sampleSummary:
        "Cross-sectional survey of N = 890 respondents (n = 708 active BNPL users; 63.37% aged 18–30; multi-group student sample n1 = 165)",
      keyFinding:
        "Financial anxiety did not correlate with overall BNPL usage frequency (p = 0.924), yet covaried strongly with non-essential hedonic credit allocation (OR = 2.078, p < 0.001; rising from 55.6% in the low-anxiety group to 79.9% in the high-anxiety group) and delinquency (B = 0.146, p < 0.001). Crucially, objective financial literacy did NOT significantly moderate the impulsivity–delinquency link (p = 0.611).",
    },
    secondaryCitation: {
      authors: "Liu & Zhang",
      year: 2021,
      title:
        "Financial literacy, self-efficacy and risky credit behavior among college students: Evidence from online consumer credit",
      journal: "Journal of Behavioral and Experimental Finance, 32, 100569",
      sampleSummary: "N = 539 college students in China",
      keyFinding:
        "Financial literacy negatively associated with risky online consumer credit behavior, and financial self-efficacy partially mediated that relationship—confidence in managing money translates knowledge into resisting credit traps.",
    },
    wager: {
      prompt:
        "In Ma et al. (2026, n = 708 active BNPL users), how did hedonic (non-essential mood-repair) BNPL use compare between the low-financial-anxiety and high-financial-anxiety groups?",
      options: [
        "It rose from 55.6% in the low-anxiety group to 79.9% in the high-anxiety group (OR = 2.078).",
        "High-anxiety users spent 0% on hedonic items and strictly bought groceries.",
        "High financial literacy completely neutralized impulsive BNPL delinquency.",
        "Financial anxiety only increased routine grocery frequency, not hedonic skew.",
      ],
      correctIndex: 0,
      comparisonBars: [
        {
          label: "Low-Anxiety Hedonic Share",
          value: 55.6,
          displayValue: "55.6%",
        },
        {
          label: "High-Anxiety Hedonic Share",
          value: 79.9,
          displayValue: "79.9% (OR 2.078)",
          highlight: true,
        },
      ],
      revealExplanation:
        "In this cross-sectional sample, higher financial anxiety was statistically associated with greater hedonic BNPL allocation (55.6% vs. 79.9%, OR = 2.078) rather than higher overall usage frequency—a covariation consistent with compensatory mood-repair under emotional strain, not proof of direct causation.",
    },
    mechanic: {
      kind: "impulse_duel",
      scenario:
        "BOSS WAVE 1 — 11:45 PM Post-Exam Checkout: You just survived a grueling midterm and feel drained. A ₹4,800 pair of wireless headphones is sitting in your cart with 'Pay in 3 zero-cost taps—₹1,600 today' pre-selected.",
      system1Excuse:
        "I earned a reward tonight, and ₹1,600 now won't break me—I'll sort next month later.",
      choices: [
        {
          label:
            "Remove default BNPL opt-in, park the headphones in the 48-Hour Vault, and go to sleep.",
          isDeliberative: true,
          feedback:
            "Boss counter #1! Ma et al. (2026) recommend dismantling frictionless default opt-ins and inserting cooling-off intervals during cognitively depleted late-night hours.",
        },
        {
          label:
            "Swipe the split-pay checkout right now to lift your mood after the exam.",
          isDeliberative: false,
          feedback:
            "Compensatory trap: Using frictionless installments for late-night mood repair relieves stress for 10 minutes while creating next-month repayment pressure.",
        },
      ],
      rounds: [
        {
          scenario:
            "BOSS WAVE 1 — 11:45 PM Post-Exam Checkout: You just survived a grueling midterm and feel drained. A ₹4,800 pair of wireless headphones is sitting in your cart with 'Pay in 3 zero-cost taps—₹1,600 today' pre-selected.",
          system1Excuse:
            "I earned a reward tonight, and ₹1,600 now won't break me—I'll sort next month later.",
          choices: [
            {
              label:
                "Remove default BNPL opt-in, park the headphones in the 48-Hour Vault, and go to sleep.",
              isDeliberative: true,
              feedback:
                "Boss counter #1! Ma et al. (2026) recommend dismantling frictionless default opt-ins and inserting cooling-off intervals during cognitively depleted late-night hours.",
            },
            {
              label:
                "Swipe the split-pay checkout right now to lift your mood after the exam.",
              isDeliberative: false,
              feedback:
                "Compensatory trap: Using frictionless installments for late-night mood repair relieves stress for 10 minutes while creating next-month repayment pressure.",
            },
          ],
        },
        {
          scenario:
            "BOSS WAVE 2 — The Knowledge Mirage: Your brain insists, 'I aced compound interest in class—I understand late fees, so I can safely manage this BNPL plan.'",
          system1Excuse:
            "Smart students don't fall into credit traps—my financial literacy protects me.",
          choices: [
            {
              label:
                "Respect cognitive depletion: test the full ₹4,800 against your real runway tomorrow morning instead of trusting late-night math.",
              isDeliberative: true,
              feedback:
                "Boss counter #2! Ma et al. (2026) found objective financial literacy did NOT significantly buffer impulsivity under stress (B = -0.024, p = 0.611), while Liu & Zhang (2021) showed self-efficacy—actually believing and practicing budget control—is what mediates safer credit behavior.",
            },
            {
              label:
                "Proceed because knowing how interest rates work guarantees self-control.",
              isDeliberative: false,
              feedback:
                "Knowing the formula doesn't stop an exhausted impulse at 11:45 PM—environmental friction and practical self-efficacy are required.",
            },
          ],
        },
        {
          scenario:
            "BOSS WAVE 3 — The Shame Spiral: You already overspent ₹600 earlier this week and hear a voice say, 'My month is already messy, so one more BNPL purchase doesn't matter.'",
          system1Excuse:
            "I already messed up my budget this week—might as well hit buy.",
          choices: [
            {
              label:
                "Use self-compassion: treat one noisy week as normal feedback, protect your self-invest bucket, and close the checkout tab.",
              isDeliberative: true,
              feedback:
                "WORLD 1 BOSS DEFEATED! Ma et al. (2026) explicitly highlight self-compassion to break the 'Financial Stress -> Self-Criticism -> Self-Regulation Failure -> Delinquency' cycle.",
            },
            {
              label:
                "Beat yourself up over the ₹600 slip and use another impulse buy to numb the stress.",
              isDeliberative: false,
              feedback:
                "Self-criticism fuels compensatory spending—breaking the shame spiral restores deliberative control.",
            },
          ],
        },
      ],
    },
    masteryQuestions: [
      {
        prompt:
          "Why did objective financial literacy fail to moderate the impulsivity–delinquency pathway in Ma et al. (2026)?",
        options: [
          "Under acute emotional strain and ego depletion, slow mathematical recall lacks momentum to override frictionless checkout impulses.",
          "Compound interest knowledge increases impulsive buying.",
          "BNPL platforms legally ban financially literate students.",
        ],
        correctIndex: 0,
        explanation:
          "Ma et al. (2026) showed the Imp × FinLit interaction was non-significant (p = 0.611): knowledge alone cannot overcome depleted late-night impulses without added checkout friction and emotion regulation.",
      },
      {
        prompt:
          "What did Liu & Zhang (2021, N = 539 students) demonstrate about how financial literacy reduces risky online consumer credit?",
        options: [
          "Financial self-efficacy partially mediates the link—confidence in budgeting and resisting traps turns knowledge into safer credit choices.",
          "Financial literacy only affects cash transactions, never online credit.",
          "Self-efficacy increases risky borrowing when students know interest formulas.",
        ],
        correctIndex: 0,
        explanation:
          "Teaching definitions alone is incomplete; literacy reduces risky online borrowing largely by strengthening students' confidence (self-efficacy) that they can manage obligations.",
      },
      {
        prompt:
          "Why must Ma et al.'s (2026) finding that anxious BNPL users skew toward hedonic spending (79.9% vs. 55.6%) be interpreted carefully?",
        options: [
          "It is cross-sectional statistical covariation (not definitive causal proof); unmanageable debt can also worsen financial anxiety in a two-way feedback loop.",
          "It proves 100% of BNPL users become delinquent.",
          "It proves financial anxiety causes higher usage frequency on everyday groceries.",
        ],
        correctIndex: 0,
        explanation:
          "The authors explicitly caution that cross-sectional surveys reveal covariation rather than one-way causality, and debt distress can also feed back into anxiety.",
      },
    ],
  },

  // =========================================================================
  // WORLD 2 — MENTAL BUCKETS & FRAMING
  // =========================================================================
  {
    id: 4,
    worldId: "world-2",
    slug: "deal-trap-broad-brackets",
    title: "The Deal Trap & Broad Brackets",
    subtitle:
      "Separating real value from discount dopamine—and zooming out from 'just ₹60/day'.",
    isBoss: false,
    estimatedSeconds: 200,
    baseXp: 120,
    perfectBonusXp: 25,
    badgeId: "bracket_architect",
    badgeName: "Broad-Bracket Architect",
    badgeDescription:
      "Separated acquisition value from transaction-utility deal traps and zoomed out to annual totals.",
    badgeIcon: "scale",
    citation: {
      authors: "Richard H. Thaler",
      year: 1999,
      title: "Mental Accounting Matters",
      journal: "Journal of Behavioral Decision Making, 12(3), 183–206",
      sampleSummary:
        "Seminal synthesis of mental accounting experiments, field anecdotes, and framing studies",
      keyFinding:
        "Consumers evaluate purchases via two utilities—acquisition utility (value vs. price paid) and transaction utility (deal quality vs. reference price). Small daily costs often go unbooked like 'petty cash', whereas broad bracketing reveals large cumulative sums.",
    },
    wager: {
      prompt:
        "In Thaler (1999), a shopper looking for a double-bed quilt saw Double ($200), Queen ($250), and King ($300) quilts all marked down to $150. Why did she buy the oversized King quilt?",
      options: [
        "Transaction utility—the $150 markdown off $300 felt like a huge 'deal', outweighing fit (acquisition utility).",
        "A king-size quilt was required for her double mattress to stay warm.",
        "Standard economic fungibility predicts larger fabric always increases happiness.",
        "She forgot what size bed she owned at home.",
      ],
      correctIndex: 0,
      comparisonBars: [
        {
          label: "Double Quilt Discount",
          value: 50,
          displayValue: "$50 off ($200 → $150)",
        },
        {
          label: "King Quilt Discount",
          value: 150,
          displayValue: "$150 off ($300 → $150)",
          highlight: true,
        },
      ],
      revealExplanation:
        "Transaction utility tracks the thrill of beating a reference price ($300 vs. $150), which can seduce us into buying the wrong size or unneeded extras just to claim a bigger discount.",
    },
    mechanic: {
      kind: "bucket_sort",
      categories: [
        {
          id: "real_acquisition",
          label: "Real Acquisition Value",
        },
        {
          id: "transaction_trap",
          label: "Transaction-Utility Trap",
        },
      ],
      items: [
        {
          id: "hoodie-sale",
          title: "50% Off Campus Hoodie Flash Sale",
          subtitle: "Marked ₹2,400 → ₹1,200, though you already own three warm hoodies.",
          correctCategoryId: "transaction_trap",
          feedback:
            "Transaction-utility trap: You aren't 'saving ₹1,200'—you're spending ₹1,200 of runway for the emotional rush of a 50% markdown.",
        },
        {
          id: "used-textbook",
          title: "Second-Hand Course Lab Manual",
          subtitle: "₹650 (vs. ₹1,400 new) for a required graded course starting Monday.",
          correctCategoryId: "real_acquisition",
          feedback:
            "Real acquisition value: You already needed the manual for coursework, and buying used captures genuine surplus below retail.",
        },
        {
          id: "bogo-snacks",
          title: "Buy-2-Get-1-Free Jumbo Energy Pack",
          subtitle: "₹450 for 3 cans when you only walked in for one ₹160 drink.",
          correctCategoryId: "transaction_trap",
          feedback:
            "Classic deal illusion: Increasing total cash outflow by ₹290 just to lower per-can price traps money you never planned to spend.",
        },
        {
          id: "semester-transit",
          title: "Discounted Student Bus Pass",
          subtitle: "₹900 upfront replacing ₹1,600 of routine daily lecture commutes.",
          correctCategoryId: "real_acquisition",
          feedback:
            "Real acquisition value: Broad-bracketing the semester shows ₹700 net savings on trips you genuinely take every week.",
        },
      ],
    },
    masteryQuestions: [
      {
        prompt:
          "In Thaler's (1999) beach beer survey, people offered a median of $2.65 for an identical beer from a resort hotel versus $1.50 from a run-down grocery store. What explains this gap?",
        options: [
          "Reference prices shift perceived fairness and transaction utility—even though the physical product and beach setting are identical.",
          "Resort beer stays colder for longer in the sun.",
          "People ignore context and evaluate every good strictly by marginal utility.",
        ],
        correctIndex: 0,
        explanation:
          "The venue shifts the expected reference price, changing transaction utility even when acquisition utility (drinking the exact same beer on the beach) is unchanged.",
      },
      {
        prompt:
          "Why does Thaler compare unrecorded daily coffees and snacks to an organization's 'petty cash' account?",
        options: [
          "Routine small expenses often go 'unbooked' individually, escaping budget scrutiny until broad bracketing adds them up over a year.",
          "Coffee purchases legally belong to petty cash accounting.",
          "Small expenses never affect a monthly budget.",
        ],
        correctIndex: 0,
        explanation:
          "Narrow daily framing ('just $2/day'—citing Gourville's pennies-a-day effect) hides how $2/day becomes $730/year once evaluated in a broad annual bracket.",
      },
      {
        prompt:
          "What is the smartest test before buying something marked '60% OFF'?",
        options: [
          "Ask whether you would still value and buy this item at its current sale price if the original crossed-out price tag didn't exist.",
          "Calculate how big the percentage discount is—anything over 50% is automatically smart.",
          "Multiply the discount amount by 12 to treat it as extra monthly income.",
        ],
        correctIndex: 0,
        explanation:
          "Ignoring the anchor tag isolates pure acquisition utility from artificial transaction utility.",
      },
    ],
  },

  {
    id: 5,
    worldId: "world-2",
    slug: "slow-brain-wishful-thinking",
    title: "Slow Brain vs. Wishful Thinking",
    subtitle:
      "Why System 2 beats 'I'll earn it back next week'—and why self-esteem calms stress without replacing plans.",
    isBoss: false,
    estimatedSeconds: 200,
    baseXp: 120,
    perfectBonusXp: 25,
    badgeId: "system2_strategist",
    badgeName: "System 2 Strategist",
    badgeDescription:
      "Countered wishful optimism with deliberate System 2 financial planning.",
    badgeIcon: "brain",
    citation: {
      authors:
        "Hashmi, Aftab, Martins, Mata, Qureshi, Abreu & Mata",
      year: 2021,
      title:
        "The role of self-esteem, optimism, deliberative thinking and self-control in shaping the financial behavior and financial well-being of young adults",
      journal: "PLOS ONE, 16(9): e0256649",
      sampleSummary:
        "N = 429 university students across public (257) and private (172) universities, analyzed with PLS-SEM",
      keyFinding:
        "Deliberative thinking (β = 0.164, p = 0.003) and self-control (β = 0.147, p = 0.009) significantly predicted positive financial behavior and financial security, whereas dispositional optimism showed no significant path to financial behavior (β = 0.084, p = 0.150) or well-being when modeled together. Self-esteem did not directly predict behavior (β = 0.100, p = 0.117) but strongly correlated with lower financial anxiety (β = -0.263, p < 0.001) and higher security (β = 0.257, p < 0.001).",
    },
    wager: {
      prompt:
        "In Hashmi et al.'s (2021) PLS-SEM study of 429 university students, which psychological traits remained statistically significant predictors of sound financial behavior when modeled together?",
      options: [
        "Deliberative thinking (β = 0.164) and self-control (β = 0.147)—while optimism (p = 0.150) and self-esteem (p = 0.117) were not significant for behavior.",
        "Wishful optimism alone predicted behavior while self-control dropped out.",
        "High self-esteem replaced the need for budgeting and tracking expenses.",
        "All four traits predicted lower financial anxiety equally.",
      ],
      correctIndex: 0,
      comparisonBars: [
        {
          label: "Deliberative → Behavior",
          value: 0.164,
          displayValue: "β = 0.164 (p = .003)",
          highlight: true,
        },
        {
          label: "Self-Control → Behavior",
          value: 0.147,
          displayValue: "β = 0.147 (p = .009)",
          highlight: true,
        },
        {
          label: "Self-Esteem → Behavior",
          value: 0.1,
          displayValue: "β = 0.100 (n.s.)",
        },
        {
          label: "Optimism → Behavior",
          value: 0.084,
          displayValue: "β = 0.084 (n.s.)",
        },
      ],
      revealExplanation:
        "Feel-good optimism didn't drive concrete money habits once modeled alongside self-control and System 2 deliberation. Meanwhile, self-esteem played a distinct emotional role—strongly reducing financial anxiety (β = -0.263) without substituting for actual planning.",
    },
    mechanic: {
      kind: "impulse_duel",
      scenario:
        "Chess Move 1 — Wishful Optimism: Your monthly runway is already tight, and a pricey weekend concert ticket drops online.",
      system1Excuse: "I'll probably have more money next week.",
      choices: [
        {
          label:
            "Run a System 2 check: only spend against confirmed cash in this month's disposable pool—not hoped-for next-week windfalls.",
          isDeliberative: true,
          feedback:
            "Winning System 2 move! Hashmi et al. (2021) found wishful optimism did not significantly predict sound financial behavior (β = 0.084, p = 0.150), whereas deliberative thinking (β = 0.164) did.",
        },
        {
          label:
            "Buy the ticket now and trust next week's freelance gig or extra allowance will show up.",
          isDeliberative: false,
          feedback:
            "Blunder: Relying on unconfirmed optimism leaves your remaining daily runway squeezed if next week's extra cash doesn't materialize.",
        },
      ],
      rounds: [
        {
          scenario:
            "Chess Move 1 — Wishful Optimism: Your monthly runway is already tight, and a pricey weekend concert ticket drops online.",
          system1Excuse: "I'll probably have more money next week.",
          choices: [
            {
              label:
                "Run a System 2 check: only spend against confirmed cash in this month's disposable pool—not hoped-for next-week windfalls.",
              isDeliberative: true,
              feedback:
                "Winning System 2 move! Hashmi et al. (2021) found wishful optimism did not significantly predict sound financial behavior (β = 0.084, p = 0.150), whereas deliberative thinking (β = 0.164) did.",
            },
            {
              label:
                "Buy the ticket now and trust next week's freelance gig or extra allowance will show up.",
              isDeliberative: false,
              feedback:
                "Blunder: Relying on unconfirmed optimism leaves your remaining daily runway squeezed if next week's extra cash doesn't materialize.",
            },
          ],
        },
        {
          scenario:
            "Chess Move 2 — Discount Framing: A ₹1,800 branded jacket is marked down to ₹1,100 during an app sale.",
          system1Excuse: "It's discounted, so it doesn't really count.",
          choices: [
            {
              label:
                "Look at the actual ₹1,100 outflow in work-hours and runway days; if it wasn't on your plan, park it in the Vault.",
              isDeliberative: true,
              feedback:
                "Strong System 2 counter! Deliberative analysis overrides gut System 1 rationalizations and keeps your monthly ledger honest.",
            },
            {
              label:
                "Treat the ₹700 markdown as 'free budget space' and tap buy.",
              isDeliberative: false,
              feedback:
                "Your bank account deducts ₹1,100—never the ₹700 you didn't spend.",
            },
          ],
        },
        {
          scenario:
            "Chess Move 3 — Social Conformity: Your lab group books a ₹1,200 per-head cafe night right after a busy week.",
          system1Excuse: "Everyone else is spending on this.",
          choices: [
            {
              label:
                "Protect your confidence without overspending: suggest a ₹250 campus hangout or cap your tab cleanly before ordering.",
              isDeliberative: true,
              feedback:
                "Checkmate! Healthy self-worth lowers social anxiety around money (Hashmi et al.: self-esteem → lower anxiety β = -0.263) while deliberative limits protect your runway.",
            },
            {
              label:
                "Match the ₹1,200 tab silently so nobody notices you're budgeting.",
              isDeliberative: false,
              feedback:
                "Social FOMO burns runway fast; true confidence means setting clear limits without guilt.",
            },
          ],
        },
      ],
    },
    masteryQuestions: [
      {
        prompt:
          "How did self-esteem relate to financial outcomes in Hashmi et al. (2021, N = 429 students)?",
        options: [
          "It showed no significant direct effect on financial behavior in the full model (β = 0.100, p = 0.117), but strongly associated with lower financial anxiety (β = -0.263) and higher financial security (β = 0.257).",
          "It replaced the need for self-control and deliberative planning.",
          "Higher self-esteem caused higher financial anxiety.",
        ],
        correctIndex: 0,
        explanation:
          "Self-esteem isn't a substitute for financial planning—it buffers emotional anxiety and bolsters perceived security while deliberative thinking and self-control drive day-to-day financial behaviors.",
      },
      {
        prompt:
          "In Dual-Process Theory (as applied by Hashmi et al., 2021), when is System 2 deliberative thinking most valuable for students?",
        options: [
          "When checking fast System 1 gut impulses ('on sale!', 'everyone is going') against actual runway limits and alternatives.",
          "Only when calculating complex tax derivatives, never for everyday spending.",
          "Never—System 1 intuition is always optimal in digital checkouts.",
        ],
        correctIndex: 0,
        explanation:
          "System 2 acts as a supervisory check on fast System 1 heuristics when stakes, framing traps, or unfamiliar trade-offs appear.",
      },
      {
        prompt:
          "Why can unbridled wishful optimism ('things will magically work out next week') hurt student finances?",
        options: [
          "Optimism alone showed no significant direct improvement on financial behavior in Hashmi et al. (2021), and extreme optimism in prior literature links to under-saving.",
          "Optimism guarantees higher bills.",
          "Optimism only works in the final week of a semester.",
        ],
        correctIndex: 0,
        explanation:
          "Positive outlook without concrete System 2 plans or self-control rules fails to protect your runway.",
      },
    ],
  },

  {
    id: 6,
    worldId: "world-2",
    slug: "boss-mental-buckets-category-blur",
    title: "Mental Buckets & Category Blur",
    subtitle:
      "World 2 Boss: Keeping bills, discretionary burn, and self-investment visible—without rigid perfectionism.",
    isBoss: true,
    estimatedSeconds: 240,
    baseXp: 160,
    perfectBonusXp: 30,
    badgeId: "bucket_master",
    badgeName: "Bucket Architect",
    badgeDescription:
      "Separated Fixed Commitments, Discretionary Burn, and Protected Invest-in-Self cleanly.",
    badgeIcon: "layers",
    citation: {
      authors: "Ruofan Bai",
      year: 2023,
      title:
        "Impact of financial literacy, mental budgeting and self control on financial wellbeing: Mediating impact of investment decision making",
      journal: "PLOS ONE, 18(11): e0294466",
      sampleSummary:
        "N = 449 Chinese university students (245 male, 204 female), analyzed via PLS-SEM",
      keyFinding:
        "Financial literacy (β = 0.299, p < 0.001), self-control (β = 0.182, p < 0.001), and mental budgeting (β = 0.102, p < 0.001) positively predicted subjective financial well-being, partially mediated by investment decision-making behavior (indirect effects p < 0.04). Warns that mixing card categories blurs tracking while overly rigid budgets backfire.",
    },
    wager: {
      prompt:
        "In Ruofan Bai's (2023) study of 449 university students, how did mental budgeting relate to financial well-being?",
      options: [
        "Mental budgeting positively predicted financial well-being (β = 0.102, p < 0.001), partly by supporting better investment decisions (indirect = 0.016, p = 0.035).",
        "Mental budgeting hurt financial well-being unless students banned all leisure spending.",
        "Only investment decisions mattered; categorizing spending had no effect.",
        "Mental budgeting worked only for finance majors, not other students.",
      ],
      correctIndex: 0,
      comparisonBars: [
        {
          label: "Fin. Literacy → Well-being",
          value: 0.299,
          displayValue: "β = 0.299",
        },
        {
          label: "Self-Control → Well-being",
          value: 0.182,
          displayValue: "β = 0.182",
        },
        {
          label: "Mental Budgeting → Well-being",
          value: 0.102,
          displayValue: "β = 0.102",
          highlight: true,
        },
      ],
      revealExplanation:
        "Keeping mental buckets visible—separating fixed obligations, everyday consumption, and self-investment—supports both immediate clarity and long-term capability choices without relying on punitive restriction.",
    },
    mechanic: {
      kind: "bucket_sort",
      categories: [
        { id: "fixed_commitments", label: "Fixed Commitments" },
        { id: "discretionary_burn", label: "Discretionary Burn" },
        { id: "invest_self", label: "Protected Invest-in-Self" },
      ],
      items: [
        {
          id: "mess-wifi-bill",
          title: "Monthly Hostel Mess & Wi-Fi Bill",
          subtitle: "Recurring unavoidable campus baseline due on the 1st.",
          correctCategoryId: "fixed_commitments",
          feedback:
            "Fixed Commitments: Reserving recurring bills first stops you from mistaking committed rent/mess money for spendable pocket cash.",
        },
        {
          id: "late-cafe-hangout",
          title: "11 PM Cafe Dessert & Rideshare",
          subtitle: "Unplanned late-evening treat after group study.",
          correctCategoryId: "discretionary_burn",
          feedback:
            "Discretionary Burn: Tagging this inside your consumption pool keeps the rest of your month honest without shaming the treat.",
        },
        {
          id: "algo-prep-course",
          title: "Coding Interview Prep Book & Mock Test",
          subtitle: "Skill-building capital for internship applications.",
          correctCategoryId: "invest_self",
          feedback:
            "Protected Invest-in-Self: Bai (2023) showed growth/investment decisions partially mediate financial well-being—protecting this bucket keeps skill growth off the chopping block.",
        },
        {
          id: "impulse-merch",
          title: "Campus Fest Hoodie & Merch Drop",
          subtitle: "Optional social-FOMO purchase outside core bills.",
          correctCategoryId: "discretionary_burn",
          feedback:
            "Discretionary Burn: Keeping optional lifestyle buys separate from Fixed Commitments prevents category blur when your card statement arrives.",
        },
      ],
    },
    masteryQuestions: [
      {
        prompt:
          "Why does Bai (2023) caution that credit cards and mixed accounts cause 'category blur'?",
        options: [
          "Pooling unrelated expenses on one card with delayed billing makes it harder to recall how much was spent inside each budget bucket.",
          "Credit cards automatically convert Invest-in-Self spending into fixed commitments.",
          "Category blur improves self-control by hiding balances.",
        ],
        correctIndex: 0,
        explanation:
          "When bills, food taps, and growth purchases blur into one undifferentiated balance, students overestimate how much disposable runway remains.",
      },
      {
        prompt:
          "What does Bai (2023) note about overly restrictive budgets and stringent deadlines (citing Ariely & Wertenbroch, 2002)?",
        options: [
          "Overly stringent self-imposed restrictions can backfire and weaken self-control compared with realistic, flexible category boundaries.",
          "The stricter and more punishing a budget is, the higher long-term adherence always becomes.",
          "Students should never allocate any money to discretionary treats.",
        ],
        correctIndex: 0,
        explanation:
          "Clear bucket visibility beats zero-flexibility austerity; rigid rules trigger burnout and 'what-the-hell' rebound spending.",
      },
      {
        prompt:
          "According to Cognitive Dissonance Theory (referenced in Bai, 2023), why does StopBucks ring-fence Invest-in-Self separately from Discretionary Burn?",
        options: [
          "Aligning spending labels with real long-term growth goals reduces guilt and inner conflict, supporting higher subjective well-being.",
          "So students can hide luxury shopping inside the Invest-in-Self category.",
          "Because books and gym passes cost zero money.",
        ],
        correctIndex: 0,
        explanation:
          "Separating genuine capability investments from consumption burn removes unfair guilt on books/courses while keeping discretionary burn transparent.",
      },
    ],
  },

  // =========================================================================
  // WORLD 3 — RESILIENCE & COMMITMENT
  // =========================================================================
  {
    id: 7,
    worldId: "world-3",
    slug: "buffer-shield",
    title: "The Buffer Shield",
    subtitle:
      "Absorbing surprise campus shocks with self-efficacy—while staying honest about real cost constraints.",
    isBoss: false,
    estimatedSeconds: 210,
    baseXp: 130,
    perfectBonusXp: 25,
    badgeId: "campus_resilience",
    badgeName: "Campus Resilience",
    badgeDescription:
      "Applied structured self-efficacy steps to handle an unexpected academic expense shock.",
    badgeIcon: "life-buoy",
    citation: {
      authors: "Cliff A. Robb",
      year: 2017,
      title: "College Student Financial Stress: Are the Kids Alright?",
      journal: "Journal of Family and Economic Issues, 38(4), 514–527",
      sampleSummary:
        "N = 324 undergraduate students at a major Midwestern university (14-item financial stress scale)",
      keyFinding:
        "Roughly 30% of surveyed undergraduates reported reducing enrolled credit hours for financial reasons. Higher financial stress correlated with lower subjective well-being and greater academic load reduction, while financial self-efficacy correlated positively with well-being and negatively with cutting credit hours.",
    },
    secondaryCitation: {
      authors: "Bartholomae & Fox",
      year: 2021,
      title:
        "A decade review of research on college student financial behavior and well-being",
      journal: "Journal of Family and Economic Issues, 42(Suppl 1), S154–S177",
      sampleSummary:
        "Synthesis of 20 empirical JFEI papers on college student finances (2010–2019)",
      keyFinding:
        "Documented a structural shift from early campus credit-card marketing toward rising student loans and unsecured debt, highlighting how economic precarity shapes emerging adults' transition to financial independence.",
    },
    wager: {
      prompt:
        "In Robb's (2017) survey of 324 undergraduates, roughly what share of students reported having reduced their academic credit hours due to financial strain?",
      options: [
        "Approximately 30% reduced credit hours for financial reasons—showing money shocks directly threaten academic momentum.",
        "Fewer than 1%, because campus expenses rarely affect course enrollment.",
        "100% of students with any student loan dropped out immediately.",
        "Only students without part-time jobs reduced credit hours.",
      ],
      correctIndex: 0,
      comparisonBars: [
        {
          label: "Reduced Credit Hours",
          value: 30,
          displayValue: "~30% of sample",
          highlight: true,
        },
        {
          label: "Maintained Full Load",
          value: 70,
          displayValue: "~70% of sample",
        },
      ],
      revealExplanation:
        "Financial stress isn't just a spreadsheet problem—about 30% of students in Robb (2017) cut credit hours under financial pressure. Note: Exact per-unit regression odds ratios from Robb's tables require full primary-text verification, while the negative link between self-efficacy and course cuts—and structural debt pressures noted by Bartholomae & Fox (2021)—is clearly established.",
    },
    mechanic: {
      kind: "feedback_loop",
      shockTitle: "Campus Shock: Dead Laptop Charger + Midterm Lab Fee",
      shockDescription:
        "Four days before midterms, your laptop charger sparks out (₹2,200 replacement) in the same week a ₹800 exam lab fee is due. Navigate a practical response.",
      steps: [
        {
          prompt:
            "Step 1 — Assess Before Panicking: You have ₹3,000 in urgent academic costs right now. What's the first self-efficacy move?",
          options: [
            {
              label:
                "Check your actual remaining consumption runway and Vault-rescued buffer to measure the exact gap.",
              isOptimal: true,
              feedback:
                "Accurate sizing builds control: Knowing your true cushion turns vague panic into a specific, solvable number.",
            },
            {
              label:
                "Avoid opening your banking or runway app and put everything on high-fee instant credit.",
              isOptimal: false,
              feedback:
                "Avoiding visibility delays adjustment and piles extra fees onto an already tight week.",
            },
          ],
        },
        {
          prompt:
            "Step 2 — Triage the Need: The checkout page suggests a ₹1,500 RGB gaming mouse bundle alongside the ₹2,200 charger.",
          options: [
            {
              label:
                "Buy only the verified ₹2,200 OEM charger and lab fee; park any nice-to-have accessories in the 48-Hour Vault.",
              isOptimal: true,
              feedback:
                "Clean triage: Separating urgent academic infrastructure from add-on desires protects your month-end cushion.",
            },
            {
              label:
                "Add the ₹1,500 accessory bundle since you're already spending anyway.",
              isOptimal: false,
              feedback:
                "Bundling wants onto an emergency need turns a ₹3,000 shock into a ₹4,500 squeeze.",
            },
          ],
        },
        {
          prompt:
            "Step 3 — Protect Structural Momentum: If your remaining disposable budget still falls ₹1,200 short after trimming discretionary extras, what should you do?",
          options: [
            {
              label:
                "Pause discretionary outings for 10 days and check campus emergency bursaries or interest-free library loaners before taking predatory credit.",
              isOptimal: true,
              feedback:
                "Smart resilience: Discipline alone can't fix every real-world cost gap, so pairing calm budget triage with institutional support preserves your credit hours.",
            },
            {
              label:
                "Drop a core course immediately without checking campus aid or adjusting discretionary burn.",
              isOptimal: false,
              feedback:
                "Explore buffer reallocation and university emergency resources before sacrificing academic progress.",
            },
          ],
        },
      ],
    },
    masteryQuestions: [
      {
        prompt:
          "Why does StopBucks track an 'Unexpected-Shock Cushion' alongside daily safe-to-spend?",
        options: [
          "Because unbuffered surprises (broken gear, exam fees) trigger acute stress that Robb (2017) linked to lower well-being and reduced course loads.",
          "Because students should never spend their budget on textbooks.",
          "Because willpower alone eliminates tuition and rent shocks.",
        ],
        correctIndex: 0,
        explanation:
          "Personal habits help build local cushions, while recognizing that structural financial shocks are real—having a visible cushion lowers stress and protects academic persistence.",
      },
      {
        prompt:
          "What macro trend did Bartholomae & Fox (2021) highlight across 20 empirical studies from 2010–2019?",
        options: [
          "Student financial risk shifted from campus credit-card marketing toward heavy student loans and rising unsecured debt in a more precarious economy.",
          "College living costs fell steadily, eliminating student borrowing.",
          "Financial behavior no longer affects emerging adults' transition to independence.",
        ],
        correctIndex: 0,
        explanation:
          "Bartholomae & Fox (2021) documented how young adults navigate steeper debt and economic precarity than prior cohorts—making realistic buffers and low-friction planning essential.",
      },
      {
        prompt:
          "In Robb (2017), how did financial self-efficacy relate to student well-being and academic persistence?",
        options: [
          "Higher financial self-efficacy correlated positively with subjective well-being and negatively with cutting enrolled credit hours.",
          "Self-efficacy had zero connection to stress or well-being.",
          "Higher self-efficacy meant students never needed any financial aid.",
        ],
        correctIndex: 0,
        explanation:
          "Believing you can execute practical money steps buffers stress and helps students stay enrolled—even though systemic affordability still matters.",
      },
    ],
  },

  {
    id: 8,
    worldId: "world-3",
    slug: "hardship-domino",
    title: "The Hardship Domino",
    subtitle:
      "Breaking the drift-to-deficit chain with mid-month feedback loops and real liquidity buffers.",
    isBoss: false,
    estimatedSeconds: 220,
    baseXp: 140,
    perfectBonusXp: 30,
    badgeId: "domino_breaker",
    badgeName: "Domino Breaker",
    badgeDescription:
      "Used Monitor–Compare–Adjust feedback loops to stop mid-month drift before hardship hits.",
    badgeIcon: "trending-up",
    citation: {
      authors: "Hernandez-Perez & Cruz Rambaud",
      year: 2025,
      title:
        "Uncovering the factors of financial well-being: the role of self-control, self-efficacy, and financial hardship",
      journal: "Future Business Journal, 11:70",
      sampleSummary:
        "N = 8,554 individuals from the nationally representative Spanish Survey of Financial Literacy (PLS-SEM)",
      keyFinding:
        "Explained R² = 0.56 of financial well-being and R² = 0.30 of financial hardship. Financial hardship strongly reduced well-being (β = -0.410, p < 0.001) and mediated 41% of the effect of poor self-control and 23% of poor self-efficacy. Maintaining a financial buffer carried the highest formative well-being weight (0.780), ahead of income (0.771).",
    },
    wager: {
      prompt:
        "In Hernandez-Perez & Cruz Rambaud (2025, N = 8,554), what percentage of the total negative effect of weak self-control on financial well-being was mediated through financial hardship?",
      options: [
        "41% ran indirectly through financial hardship (vs. 23% for low self-efficacy), with financial buffer carrying the top well-being weight (0.780).",
        "0%—self-control only mattered psychologically and never caused budget deficits.",
        "Income outweighed financial buffers by more than 5-to-1.",
        "100% of hardship was explained by income alone.",
      ],
      correctIndex: 0,
      comparisonBars: [
        {
          label: "Hardship Mediation: Self-Control",
          value: 41,
          displayValue: "41% mediated",
          highlight: true,
        },
        {
          label: "Hardship Mediation: Self-Efficacy",
          value: 23,
          displayValue: "23% mediated",
        },
      ],
      revealExplanation:
        "Impulsive overspending creates budget deficits and late bills—and that resulting financial hardship accounts for 41% of how low self-control erodes overall well-being. Catching drift mid-month breaks the domino chain.",
    },
    mechanic: {
      kind: "feedback_loop",
      shockTitle: "Mid-Month Drift: Day 15 Runway Check",
      shockDescription:
        "It's the 15th of the month, and early-month treats pushed your burn pace 18% ahead of the linear line. Walk through Scheier & Carver's 3-step self-regulation loop.",
      steps: [
        {
          prompt:
            "1. Mid-month Monitor: Your bank balance feels 'okay', yet you notice several unlogged cashless snack taps. What's the first feedback step?",
          options: [
            {
              label:
                "Reconcile those taps in your ledger right now so you see your true month-to-date consumption vs. remaining days.",
              isOptimal: true,
              feedback:
                "Monitor step complete: Self-regulation starts with clear feedback—ignoring the numbers ('ostrich effect') lets silent drift compound into a month-end deficit.",
            },
            {
              label:
                "Skip checking until the 28th so you don't stress yourself out today.",
              isOptimal: false,
              feedback:
                "Blind pacing delays correction until few days remain, making the final week painfully tight.",
            },
          ],
        },
        {
          prompt:
            "2. Compare: Your remaining safe-to-spend dropped from ₹450/day to ₹310/day, while an ₹800 fixed Wi-Fi bill is already ring-fenced.",
          options: [
            {
              label:
                "Compare current pace against your remaining 15 days and treat the tight pace as an early-warning watch, not failure.",
              isOptimal: true,
              feedback:
                "Compare step complete: Spotting a gap early gives you 15 full days to adjust smoothly—long before real hardship or delayed bills occur.",
            },
            {
              label:
                "Borrow ₹800 from your fixed Wi-Fi bill bucket to keep spending ₹450/day.",
              isOptimal: false,
              feedback:
                "Raiding fixed-commitment money sets up a delayed-bill domino—one of the exact hardship indicators in Hernandez-Perez & Cruz Rambaud (2025).",
            },
          ],
        },
        {
          prompt:
            "3. Adjust: How do you bring the final 15 days back into surplus without burning out?",
          options: [
            {
              label:
                "Route non-essential convenience buys into the 48-Hour Vault and trim ₹140/day of low-value taps while keeping fixed bills and Invest-in-Self intact.",
              isOptimal: true,
              feedback:
                "Adjust step complete! Small, calibrated mid-month adjustments protect both your buffer and your semester goals.",
            },
            {
              label:
                "Slash all food and study expenses to zero for three days, then quit budgeting altogether.",
              isOptimal: false,
              feedback:
                "All-or-nothing crashes don't last; calm calibration wins.",
            },
          ],
        },
      ],
    },
    masteryQuestions: [
      {
        prompt:
          "In Hernandez-Perez & Cruz Rambaud's (2025) measurement model of Financial Well-Being, how did 'Financial Buffer' compare to 'Income'?",
        options: [
          "Financial Buffer carried the highest outer weight (0.780), slightly ahead of Income (0.771) and Financial Satisfaction (0.750).",
          "Income was the only valid indicator; buffers had zero weight.",
          "Financial Buffer had a negative weight on well-being.",
        ],
        correctIndex: 0,
        explanation:
          "How long your liquid reserve can absorb shocks (0.780) is at least as central to financial well-being as raw monthly income (0.771).",
      },
      {
        prompt:
          "What are the three phases of the Scheier & Carver self-regulation feedback loop applied in Level 8?",
        options: [
          "Monitor current state, Compare against goal/pace, and Adjust behavior early to close discrepancies.",
          "Earn, Spend, and Hope.",
          "Ignore, Borrow, and Panic.",
        ],
        correctIndex: 0,
        explanation:
          "Regular Monitor–Compare–Adjust check-ins stop minor budget drift from turning into delayed bills and hardship.",
      },
      {
        prompt:
          "If your mid-month projection shows a temporary budget deficit watch, what does that actually mean?",
        options: [
          "Your current daily pace would exceed your remaining disposable pool by month-end unless adjusted—it is an early steering signal, not confirmed permanent hardship.",
          "You have permanently failed at personal finance.",
          "Your fixed commitments should be deleted from the app.",
        ],
        correctIndex: 0,
        explanation:
          "A deficit watch is actionable telemetry, not a label of failure—early adjustments can flip a projected deficit back to surplus.",
      },
    ],
  },

  {
    id: 9,
    worldId: "world-3",
    slug: "boss-golden-eggs-liquidity-trap",
    title: "Golden Eggs & The Liquidity Trap",
    subtitle:
      "Final Boss: Why instant liquidity amplifies present bias—and how commitment devices protect your future self.",
    isBoss: true,
    estimatedSeconds: 260,
    baseXp: 200,
    perfectBonusXp: 40,
    badgeId: "golden_egg_crown",
    badgeName: "Golden Egg Master",
    badgeDescription:
      "Mastered quasi-hyperbolic discounting and defended your commitment devices against instant liquidity.",
    badgeIcon: "crown",
    citation: {
      authors: "David Laibson",
      year: 1997,
      title: "Golden Eggs and Hyperbolic Discounting",
      journal: "Quarterly Journal of Economics, 112(2), 443–477",
      sampleSummary:
        "Theoretical quasi-hyperbolic (β, δ) life-cycle model with calibrated Table II welfare simulations",
      keyFinding:
        "Under quasi-hyperbolic discounting (1, βδ, βδ², ...), financial innovation that provides instant liquidity and eliminates illiquid commitment assets ('golden eggs') causes welfare losses rising from 0.0% (β = 1.0) to 1.6% (β = 0.8), 9.0% (β = 0.6), and 29.5% of output (β = 0.4).",
    },
    wager: {
      prompt:
        "In Laibson's (1997) Table II calibration, when instant credit eliminates illiquid commitment assets, how fast does the welfare loss climb as present bias intensifies from β = 0.8 to β = 0.4?",
      options: [
        "From 1.6% of output (β = 0.8) to 9.0% (β = 0.6) to 29.5% of output (β = 0.4).",
        "Welfare loss stays at 0% because more liquidity is always strictly better.",
        "It increases linearly at 1% per 0.1 drop in β.",
        "Only β = 1.0 consumers suffer welfare losses from liquidity.",
      ],
      correctIndex: 0,
      comparisonBars: [
        { label: "β = 1.0 (Exponential)", value: 0, displayValue: "0.0%" },
        { label: "β = 0.8 (Mild Bias)", value: 1.6, displayValue: "1.6%" },
        { label: "β = 0.6 (Moderate)", value: 9.0, displayValue: "9.0%" },
        {
          label: "β = 0.4 (Strong Bias)",
          value: 29.5,
          displayValue: "29.5% loss",
          highlight: true,
        },
      ],
      revealExplanation:
        "In Laibson's model, more instant liquidity isn't automatically better for a present-biased decision maker (β < 1): without illiquid 'golden egg' barriers, each today-self raids tomorrow's savings, compounding welfare losses up to 29.5% of output at β = 0.4.",
    },
    mechanic: {
      kind: "interactive_slider",
      sliderLabel: "Present-Bias Factor (β)",
      min: 0.4,
      max: 1.0,
      step: 0.1,
      defaultValue: 0.6,
      unit: "β",
      presetKey: "hyperbolic_beta",
      challengePrompt:
        "Slide β from 0.4 to 1.0 to see how present bias steepens the immediate drop after Period 0—and why commitment devices restore long-run alignment.",
      targetRange: { min: 0.8, max: 1.0 },
      insightText:
        "Behavioral-design analogy: StopBucks's 48-Hour Vault and ring-fenced buckets don't literally recreate Laibson's macroeconomic equilibrium—they act as a practical campus commitment device adding mild intentional friction against β < 1 impulses.",
    },
    masteryQuestions: [
      {
        prompt:
          "In Laibson's (1997) quasi-hyperbolic sequence (1, βδ, βδ², βδ³, ...), what does β < 1 represent?",
        options: [
          "Present bias: an extra sharp drop in weight between right now (period 0) and any future period (period 1+), creating conflict between today's self and tomorrow's planned self.",
          "Negative bank interest rates.",
          "Inflation eroding cash equally across all future years.",
        ],
        correctIndex: 0,
        explanation:
          "Notice that between t = 1 and t = 2, the relative discount factor is still δ—the dramatic kink happens right at t = 0 vs. t = 1 because of β!",
      },
      {
        prompt:
          "Why can removing borrowing constraints and making all savings instantly liquid actually reduce welfare in Laibson's model?",
        options: [
          "Without commitment barriers like illiquid 'golden egg' assets requiring advance notice, present-biased consumers over-consume immediately when liquidity is frictionless.",
          "Illiquid assets always pay higher nominal coupons than liquid accounts.",
          "Consumers forget how to add and subtract when accounts are liquid.",
        ],
        correctIndex: 0,
        explanation:
          "Time-inconsistent preferences mean your future self wants today's self to be constrained; instant liquidity strips away that protective guardrail.",
      },
      {
        prompt:
          "How does StopBucks's 48-Hour Cool-Off Vault relate to Laibson's (1997) 'Golden Eggs' framework?",
        options: [
          "It is a practical behavioral-design analogy—creating a temporary waiting barrier so cool tomorrow's self decides instead of hot tonight's self—rather than a literal macroeconomic simulation.",
          "It literally models CRRA life-cycle equilibrium output in Python.",
          "It locks your money away permanently so you can never buy anything.",
        ],
        correctIndex: 0,
        explanation:
          "Adding a deliberate 48-hour pause mirrors Laibson's advance-notice illiquidity mechanism as a lightweight, user-controlled student commitment tool.",
      },
    ],
  },
] as const;

export function getDojoWorld(worldId: DojoWorldId | 1 | 2 | 3): DojoWorld {
  const world = DOJO_WORLDS.find(
    (entry) => entry.id === worldId || entry.worldNumber === worldId
  );
  if (!world) {
    throw new RangeError(`Unknown Dojo world: ${String(worldId)}`);
  }
  return world;
}

export function getDojoLevel(levelId: DojoLevelId): DojoLevel {
  const level = DOJO_LEVELS.find((entry) => entry.id === levelId);
  if (!level) {
    throw new RangeError(`Unknown Dojo level: ${String(levelId)}`);
  }
  return level;
}
