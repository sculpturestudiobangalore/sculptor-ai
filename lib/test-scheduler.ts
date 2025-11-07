import { ConstraintScheduler } from './scheduler-engine';

async function testScheduler() {
  console.log('🧪 Testing Ultimate Scheduler...');
  
  const scheduler = new ConstraintScheduler();
  const schedule = await scheduler.generateDailySchedule(new Date());
  
  console.log('📅 Schedule:', schedule);
  console.log('🔄 Parallel Opportunities:', schedule.parallelOpportunities);
  console.log('⚠️ Risks:', schedule.riskFactors);
  console.log('🎯 Confidence:', schedule.confidenceScore);
}

testScheduler();