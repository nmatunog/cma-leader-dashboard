// Helper function to handle activity planning chat completion
export async function generateActivityPlanFromChatData(
  userState: { name: string; rank: string; agency: string },
  simulationData: {
    personalFYC: number;
    activeRecruits: number;
    tenuredCount: number;
    tenuredProd: number;
    newCount: number;
    newProd: number;
    persistency: number;
  },
  chatData: {
    newAdvisors?: number;
    clientsPerWeek?: number;
    jfwsPerWeek?: number;
    recruitmentInterviewsPerWeek?: number;
    agencyAssembly?: { frequency: string; schedule: string };
    unitMeeting?: { frequency: string; schedule: string };
    businessReview?: { frequency: string; schedule: string };
    morningMeeting?: { frequency: string; schedule: string };
    aceSbsg?: { frequency: string; schedule: string };
  }
): Promise<{ success: boolean; response?: string; error?: string }> {
  try {
    const response = await fetch('/api/ai/activity-planning', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        context: {
          leaderName: userState.name,
          rank: userState.rank,
          agency: userState.agency,
          personalFYC: simulationData.personalFYC,
          activeRecruits: simulationData.activeRecruits,
          tenuredCount: simulationData.tenuredCount,
          tenuredProd: simulationData.tenuredProd,
          newCount: simulationData.newCount,
          newProd: simulationData.newProd,
          persistency: simulationData.persistency,
          // Chat-collected data
          newAdvisors: chatData.newAdvisors,
          clientsPerWeek: chatData.clientsPerWeek,
          jfwsPerWeek: chatData.jfwsPerWeek,
          recruitmentInterviewsPerWeek: chatData.recruitmentInterviewsPerWeek,
          agencyAssembly: chatData.agencyAssembly,
          unitMeeting: chatData.unitMeeting,
          businessReview: chatData.businessReview,
          morningMeeting: chatData.morningMeeting,
          aceSbsg: chatData.aceSbsg,
        },
      }),
    });

    const data = await response.json();

    if (data.success && data.response) {
      return { success: true, response: data.response };
    } else {
      return { success: false, error: data.error || 'Failed to generate activity plan' };
    }
  } catch (error) {
    console.error('Error generating activity plan:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate activity plan',
    };
  }
}


