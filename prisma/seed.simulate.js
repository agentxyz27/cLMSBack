/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              CLMS — Simulation Seed                                    ║
 * ║              node prisma/seed.simulate.js                              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * IMPORTANT: Run your real seed.js FIRST before this one.
 *   node prisma/seed.js          ← grades, sections, subjects, topics, badges
 *   node prisma/seed.simulate.js ← teacher, students, classrooms, lessons, questions
 *
 * What this adds (never duplicates):
 *   1 Teacher       → sim.teacher@clms.dev
 *   40 Students     → 20 in Grade 4 – Ichigo, 20 in Grade 5 – Aizen
 *   2 ClassRooms    → one per section, Mathematics
 *   5 Lessons       → 3 in Classroom A, 2 in Classroom B
 *   50 Questions    → 10 per lesson
 *   3 Templates     → one remedial template per topic
 *
 * Topics used: Fractions, Decimals, Addition
 * (all already seeded by your seed.js)
 *
 * Safe to re-run — uses upsert / findFirst guards throughout.
 */

require('dotenv').config()
const { PrismaPg } = require('@prisma/adapter-pg')
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

// ── Helpers ────────────────────────────────────────────────────────────────

const hash  = (plain) => bcrypt.hashSync(plain, 10)
const pad   = (n, len = 2) => String(n).padStart(len, '0')
const lrn   = (n) => String(n).padStart(12, '0')

// ── Question content per topic ─────────────────────────────────────────────

const QUESTION_BANK = {
  Fractions: [
    { prompt: 'What is 1/2 + 1/4?',                                              answer: '3/4'  },
    { prompt: 'Which fraction is equivalent to 2/4?',                            answer: '1/2'  },
    { prompt: 'Order from smallest to largest: 1/3, 1/2, 1/4',                  answer: '1/4, 1/3, 1/2' },
    { prompt: 'What fraction of the shape is shaded if 3 out of 4 parts are?',  answer: '3/4'  },
    { prompt: 'What is 3/4 - 1/4?',                                              answer: '2/4'  },
    { prompt: 'Match each fraction to its picture: 1/2, 1/3, 1/4',             answer: 'drag_match' },
    { prompt: 'Fill in the missing numerator: __/8 = 1/2',                      answer: '4'    },
    { prompt: 'Group these: proper fractions vs improper fractions',            answer: 'visual_group' },
    { prompt: 'Place 1/2 on the number line between 0 and 1',                   answer: '0.5'  },
    { prompt: 'You ate 2/8 of a pizza. What fraction is left?',                 answer: '6/8'  },
  ],
  Decimals: [
    { prompt: 'What is 0.5 + 0.3?',                                             answer: '0.8'  },
    { prompt: 'Which decimal is equivalent to 1/2?',                            answer: '0.5'  },
    { prompt: 'Order from smallest: 0.3, 0.15, 0.5',                           answer: '0.15, 0.3, 0.5' },
    { prompt: 'Round 3.76 to the nearest tenth',                                answer: '3.8'  },
    { prompt: 'What is 1.2 - 0.7?',                                             answer: '0.5'  },
    { prompt: 'Match each decimal to its fraction: 0.5, 0.25, 0.75',           answer: 'drag_match' },
    { prompt: 'Fill in the missing digit: 0._ 0 = 0.50',                       answer: '5'    },
    { prompt: 'Group these: decimals less than 1 vs greater than 1',           answer: 'visual_group' },
    { prompt: 'Place 0.75 on the number line between 0 and 1',                 answer: '0.75' },
    { prompt: 'Write 3/4 as a decimal',                                         answer: '0.75' },
  ],
  Addition: [
    { prompt: 'What is 345 + 278?',                                             answer: '623'  },
    { prompt: 'Which two numbers sum to 100? (45, 55, 60)',                     answer: '45 and 55' },
    { prompt: 'Order these sums: 12+8, 5+3, 20+4',                             answer: '8, 20, 24' },
    { prompt: 'Fill in the missing addend: 45 + __ = 100',                     answer: '55'   },
    { prompt: 'What is 1,234 + 567?',                                           answer: '1801' },
    { prompt: 'Match each addition problem to its answer',                      answer: 'drag_match' },
    { prompt: 'Fill in the missing step: 23 + 19 = 23 + 20 - __',             answer: '1'    },
    { prompt: 'Group these sums: even results vs odd results',                 answer: 'visual_group' },
    { prompt: 'Place the sum of 25 + 50 on the number line',                   answer: '75'   },
    { prompt: 'A class has 23 boys and 19 girls. How many students total?',    answer: '42'   },
  ],
}

const TEMPLATE_TYPES = ['MULTIPLE_CHOICE', 'DRAG_MATCH', 'FILL_STEP', 'VISUAL_GROUPING', 'NUMBER_LINE']

function makeQuestions(lessonId, topicId, topicName) {
  const bank = QUESTION_BANK[topicName]
  return bank.map((q, i) => ({
    lessonId,
    topicId,
    templateType: TEMPLATE_TYPES[i % TEMPLATE_TYPES.length],
    order:        i + 1,
    contentJson: {
      prompt: q.prompt,
      answer: q.answer,
      hints: [
        `Hint 1: Think carefully about what the question is asking.`,
        `Hint 2: Try breaking the problem into smaller steps.`,
      ],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  }))
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('🎭  Starting simulation seed...\n')
  console.log('  (Requires seed.js to have been run first)\n')

  // ── 1. Look up existing data from seed.js ────────────────────────────────
  console.log('  Looking up existing seed data...')

  const mathematics = await prisma.subject.findUnique({ where: { name: 'Mathematics' } })
  if (!mathematics) throw new Error('Mathematics subject not found. Run seed.js first.')

  // Use Grade 4 – Ichigo and Grade 5 – Aizen (already seeded by seed.js)
  const grade4 = await prisma.grade.findUnique({ where: { level: 4 } })
  const grade5 = await prisma.grade.findUnique({ where: { level: 5 } })
  if (!grade4 || !grade5) throw new Error('Grades not found. Run seed.js first.')

  const sectionIchigo = await prisma.section.findFirst({ where: { gradeId: grade4.id, name: 'Ichigo' } })
  const sectionAizen  = await prisma.section.findFirst({ where: { gradeId: grade5.id, name: 'Aizen'  } })
  if (!sectionIchigo) throw new Error('Section "Ichigo" (Grade 4) not found. Run seed.js first.')
  if (!sectionAizen)  throw new Error('Section "Aizen" (Grade 5) not found. Run seed.js first.')

  const topicFractions = await prisma.topic.findFirst({ where: { subjectId: mathematics.id, name: 'Fractions' } })
  const topicDecimals  = await prisma.topic.findFirst({ where: { subjectId: mathematics.id, name: 'Decimals'  } })
  const topicAddition  = await prisma.topic.findFirst({ where: { subjectId: mathematics.id, name: 'Addition'  } })
  if (!topicFractions || !topicDecimals || !topicAddition) {
    throw new Error('Topics not found. Run seed.js first.')
  }

  console.log('  ✓ Found: Mathematics, Grades, Sections, Topics\n')

  // ── 2. Simulation Teacher ────────────────────────────────────────────────
  console.log('  Creating simulation teacher...')
  let teacher = await prisma.teacher.findFirst({ where: { email: 'sim.teacher@clms.dev' } })
  if (!teacher) {
    teacher = await prisma.teacher.create({
      data: {
        name:     'Simulation Teacher',
        email:    'sim.teacher@clms.dev',
        password: hash('simpassword123'),
        isAdmin:  false,
      },
    })
  }
  console.log(`  ✓ Teacher: ${teacher.email} (id: ${teacher.id})\n`)

  // ── 3. Students ──────────────────────────────────────────────────────────
  console.log('  Creating 40 simulation students (20 per section)...')

  const sectionConfigs = [
    { section: sectionIchigo, prefix: 'IC', label: 'Ichigo', lrnBase: 10000 },
    { section: sectionAizen,  prefix: 'AZ', label: 'Aizen',  lrnBase: 20000 },
  ]

  const allStudents = {}
  for (const { section, prefix, label, lrnBase } of sectionConfigs) {
    allStudents[section.id] = []
    for (let i = 1; i <= 20; i++) {
      const email = `sim.${prefix.toLowerCase()}${pad(i)}@clms.dev`
      let student = await prisma.student.findFirst({ where: { email } })
      if (!student) {
        student = await prisma.student.create({
          data: {
            name:      `${label} Sim ${pad(i)}`,
            lrn:       lrn(lrnBase + i),
            email,
            password:  hash('simpassword123'),
            sectionId: section.id,
          },
        })
      }
      allStudents[section.id].push(student)
    }
    console.log(`    ↳ 20 students in ${label}`)
  }
  console.log('  ✓ 40 students\n')

  // ── 4. ClassRooms ────────────────────────────────────────────────────────
  console.log('  Creating 2 simulation classrooms...')

  let classroomA = await prisma.classRoom.findFirst({
    where: { teacherId: teacher.id, subjectId: mathematics.id, sectionId: sectionIchigo.id },
  })
  if (!classroomA) {
    classroomA = await prisma.classRoom.create({
      data: { teacherId: teacher.id, subjectId: mathematics.id, sectionId: sectionIchigo.id },
    })
  }

  let classroomB = await prisma.classRoom.findFirst({
    where: { teacherId: teacher.id, subjectId: mathematics.id, sectionId: sectionAizen.id },
  })
  if (!classroomB) {
    classroomB = await prisma.classRoom.create({
      data: { teacherId: teacher.id, subjectId: mathematics.id, sectionId: sectionAizen.id },
    })
  }

  console.log(`  ✓ Classroom A — Ichigo (id: ${classroomA.id})`)
  console.log(`  ✓ Classroom B — Aizen  (id: ${classroomB.id})\n`)

  // ── 5. Lessons ───────────────────────────────────────────────────────────
  console.log('  Creating 5 lessons...')

  const lessonDefs = [
    { classRoomId: classroomA.id, title: 'Introduction to Fractions',        topicId: topicFractions.id, topicName: 'Fractions' },
    { classRoomId: classroomA.id, title: 'Adding and Subtracting Fractions', topicId: topicFractions.id, topicName: 'Fractions' },
    { classRoomId: classroomA.id, title: 'Understanding Decimals',           topicId: topicDecimals.id,  topicName: 'Decimals'  },
    { classRoomId: classroomB.id, title: 'Place Value and Addition',         topicId: topicAddition.id,  topicName: 'Addition'  },
    { classRoomId: classroomB.id, title: 'Decimal Addition',                 topicId: topicDecimals.id,  topicName: 'Decimals'  },
  ]

  const lessons = []
  for (const def of lessonDefs) {
    let lesson = await prisma.lesson.findFirst({
      where: { classRoomId: def.classRoomId, title: def.title },
    })
    if (!lesson) {
      lesson = await prisma.lesson.create({
        data: {
          title:       def.title,
          classRoomId: def.classRoomId,
          contentJson: {
            canvas:   { width: 1280, height: 720, background: '#ffffff' },
            elements: [
              {
                id: 'el_title', type: 'text',
                x: 100, y: 40, width: 600, height: 80,
                props: { text: def.title, fontSize: 32, fontWeight: 'bold' },
              },
            ],
          },
        },
      })
    }
    lessons.push({ ...lesson, topicId: def.topicId, topicName: def.topicName })
    console.log(`    ↳ [${lesson.id}] ${def.title}`)
  }
  console.log('  ✓ 5 lessons\n')

  // ── 6. Questions ─────────────────────────────────────────────────────────
  console.log('  Creating 10 questions per lesson...')

  for (const lesson of lessons) {
    const existing = await prisma.question.count({ where: { lessonId: lesson.id } })
    if (existing >= 10) {
      console.log(`    ↳ [${lesson.id}] already has questions — skipping`)
      continue
    }
    const questions = makeQuestions(lesson.id, lesson.topicId, lesson.topicName)
    await prisma.question.createMany({ data: questions, skipDuplicates: true })
    console.log(`    ↳ [${lesson.id}] ${lesson.title}`)
  }
  console.log('  ✓ 50 questions\n')

  // ── 7. Templates ─────────────────────────────────────────────────────────
  console.log('  Creating remediation templates...')

  const templateDefs = [
    { title: '[SIM] Fraction Visual Match — Remedial', topicId: topicFractions.id, interactionType: 'DRAG_MATCH'      },
    { title: '[SIM] Decimal Number Line — Remedial',   topicId: topicDecimals.id,  interactionType: 'NUMBER_LINE'     },
    { title: '[SIM] Addition Step Fill — Remedial',    topicId: topicAddition.id,  interactionType: 'FILL_STEP'       },
  ]

  for (const td of templateDefs) {
    const existing = await prisma.template.findFirst({ where: { title: td.title } })
    if (!existing) {
      await prisma.template.create({
        data: {
          title:          td.title,
          topicId:        td.topicId,
          difficulty:     1,
          interactionType:td.interactionType,
          isPublic:       true,
          teacherId:      teacher.id,
          contentJson: {
            canvas:   { width: 1280, height: 720, background: '#fafafa' },
            elements: [
              {
                id: 'el_prompt', type: 'text',
                x: 100, y: 60, width: 800, height: 60,
                props: { text: td.title, fontSize: 24 },
              },
            ],
          },
        },
      })
    }
  }
  console.log('  ✓ 3 templates\n')

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('╔══════════════════════════════════════════════╗')
  console.log('║         Simulation Seed Complete ✓           ║')
  console.log('╠══════════════════════════════════════════════╣')
  console.log(`║  Teacher      sim.teacher@clms.dev           ║`)
  console.log(`║  Students     40  (sim.ic01–20, sim.az01–20) ║`)
  console.log(`║  ClassRooms   A: ${classroomA.id}   B: ${classroomB.id}                        ║`)
  console.log('║  Lessons      5   (IDs printed below)        ║')
  console.log('║  Questions    50  (10 per lesson)            ║')
  console.log('║  Templates    3   (one per topic)            ║')
  console.log('╠══════════════════════════════════════════════╣')
  console.log('║  Copy these into n8n workflow config:        ║')
  console.log('╠══════════════════════════════════════════════╣')
  console.log(`║  Classroom A (Ichigo): ${classroomA.id}`)
  console.log(`║  Classroom B (Aizen):  ${classroomB.id}`)
  console.log('║')
  console.log('║  Lessons:')
  for (const l of lessons) {
    console.log(`║    [${l.id}] ${l.title}`)
  }
  console.log('╚══════════════════════════════════════════════╝')
  console.log('\n  Next steps:')
  console.log('  1. node routes/simulate.js is already mounted? If not, mount it.')
  console.log('  2. Test: POST /simulate/session { studentId, lessonId, profile }')
  console.log('  3. Bulk seed: POST /simulate/classroom { classRoomId: ' + classroomA.id + ' }')
  console.log('  4. Import n8n-simulator-workflow.json and update IDs above.')
}

main()
  .catch((e) => {
    console.error('❌  Simulation seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())