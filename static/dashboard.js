document.addEventListener("DOMContentLoaded", async () => {
  // Primeiro, detecta o ambiente
  let isVercel = false;
  try {
    const response = await fetch("/api/environment");
    const data = await response.json();
    isVercel = data.is_vercel;
  } catch (error) {
    console.error(
      "Não foi possível detectar o ambiente, assumindo 'Local'.",
      error
    );
  }

  // Agora, busca os dados da fonte correta
  fetchDashboardData(isVercel);
});

async function fetchDashboardData(isVercelEnv) {
  let data = {}; // Usamos um objeto para manter a estrutura do backend
  try {
    if (isVercelEnv) {
      // Se estiver online, pega os dados do LocalStorage
      console.log("Dashboard: Carregando dados do LocalStorage.");
      const localData = JSON.parse(
        localStorage.getItem("analysisHistory") || "[]"
      );
      // Simula a estrutura de dados do backend para reutilizar o código dos gráficos
      data = { all_data: localData };
    } else {
      // Se estiver local, busca do banco de dados pela API
      console.log("Dashboard: Carregando dados do Banco de Dados (API).");
      const response = await fetch("/dashboard/data");
      if (!response.ok)
        throw new Error("Falha ao buscar dados do dashboard do servidor.");
      const serverData = await response.json();
      // A resposta do servidor já vem no formato { all_data: [...] }
      data = serverData;
    }
    processAndRenderCharts(data);
  } catch (error) {
    console.error("Erro ao carregar dados do dashboard:", error);
  }
}

function processAndRenderCharts(data) {
  const allData = data.all_data;

  if (!allData || allData.length === 0) {
    return;
  }

  const classificationCounts = allData.reduce((acc, item) => {
    const classification = item.classification || "Desconhecido";
    acc[classification] = (acc[classification] || 0) + 1;
    return acc;
  }, {});
  renderClassificationChart(classificationCounts);

  const keyTopicCounts = allData.reduce((acc, item) => {
    const topic = item.key_topic || "N/A";
    if (topic !== "N/A") {
      acc[topic] = (acc[topic] || 0) + 1;
    }
    return acc;
  }, {});
  const sortedTopics = Object.entries(keyTopicCounts).sort(
    ([, a], [, b]) => b - a
  );
  renderTopicsList(sortedTopics);

  let sentimentsOverTime = data.sentiments_over_time;
  let classificationsOverTime = data.classifications_over_time;

  if (!sentimentsOverTime || !classificationsOverTime) {
    sentimentsOverTime = {};
    classificationsOverTime = {};
    allData.forEach((item) => {
      try {
        const dateStr = new Date(item.created_at).toISOString().split("T")[0];
        if (!sentimentsOverTime[dateStr]) sentimentsOverTime[dateStr] = {};
        if (!classificationsOverTime[dateStr])
          classificationsOverTime[dateStr] = {};
        const sentiment = item.sentiment || "Neutro";
        sentimentsOverTime[dateStr][sentiment] =
          (sentimentsOverTime[dateStr][sentiment] || 0) + 1;
        const classification = item.classification || "Desconhecido";
        classificationsOverTime[dateStr][classification] =
          (classificationsOverTime[dateStr][classification] || 0) + 1;
      } catch (e) {}
    });
  }
  renderSentimentOverTimeChart(sentimentsOverTime);
  renderClassificationOverTimeChart(classificationsOverTime);
}

function renderClassificationChart(counts) {
  const ctx = document.getElementById("classificationChart").getContext("2d");
  new Chart(ctx, {
    type: "pie",
    data: {
      labels: Object.keys(counts),
      datasets: [
        {
          label: "Classificações",
          data: Object.values(counts),
          backgroundColor: ["#10b981", "#6b7280", "#ef4444", "#f59e0b"],
          hoverOffset: 4,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "top" },
      },
    },
  });
}

function renderTopicsList(sortedTopics) {
  const listElement = document.getElementById("topics-list");
  if (sortedTopics.length === 0) {
    listElement.innerHTML = "<li>Nenhum tópico chave identificado ainda.</li>";
    return;
  }
  listElement.innerHTML = sortedTopics
    .map(
      ([topic, count]) =>
        `<li><span class="topic-name">${topic}</span><span class="topic-count">${count}</span></li>`
    )
    .join("");
}

function renderSentimentOverTimeChart(data) {
  const ctx = document
    .getElementById("sentimentOverTimeChart")
    .getContext("2d");

  const labels = Object.keys(data).sort();

  const positiveData = labels.map((date) => data[date]["Positivo"] || 0);
  const negativeData = labels.map((date) => data[date]["Negativo"] || 0);
  const neutralData = labels.map((date) => data[date]["Neutro"] || 0);

  new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Positivo",
          data: positiveData,
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          fill: true,
          tension: 0.3,
          // --- ALTERAÇÕES AQUI ---
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: "#10b981",
          // --- FIM DAS ALTERAÇÕES ---
        },
        {
          label: "Negativo",
          data: negativeData,
          borderColor: "#ef4444",
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          fill: true,
          tension: 0.3,
          // --- ALTERAÇÕES AQUI ---
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: "#ef4444",
          // --- FIM DAS ALTERAÇÕES ---
        },
        {
          label: "Neutro",
          data: neutralData,
          borderColor: "#6b7280",
          backgroundColor: "rgba(107, 114, 128, 0.1)",
          fill: true,
          tension: 0.3,
          // --- ALTERAÇÕES AQUI ---
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: "#6b7280",
          // --- FIM DAS ALTERAÇÕES ---
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        x: {
          type: "time",
          time: {
            unit: "day",
            tooltipFormat: "dd/MM/yyyy",
          },
          title: { display: true, text: "Data" },
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: "Número de E-mails" },
        },
      },
    },
  });
}

function renderClassificationOverTimeChart(data) {
  const ctx = document
    .getElementById("classificationOverTimeChart")
    .getContext("2d");

  const labels = Object.keys(data).sort();

  const productiveData = labels.map((date) => data[date]["Produtivo"] || 0);
  const unproductiveData = labels.map((date) => data[date]["Improdutivo"] || 0);

  new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Produtivo",
          data: productiveData,
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          fill: true,
          tension: 0.3,
          // --- ALTERAÇÕES ADICIONADAS AQUI ---
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: "#3b82f6",
          // --- FIM DAS ALTERAÇÕES ---
        },
        {
          label: "Improdutivo",
          data: unproductiveData,
          borderColor: "#f97316",
          backgroundColor: "rgba(249, 115, 22, 0.1)",
          fill: true,
          tension: 0.3,
          // --- ALTERAÇÕES ADICIONADAS AQUI ---
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: "#f97316",
          // --- FIM DAS ALTERAÇÕES ---
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        x: {
          type: "time",
          time: {
            unit: "day",
            tooltipFormat: "dd/MM/yyyy",
          },
          title: { display: true, text: "Data" },
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: "Número de E-mails" },
        },
      },
    },
  });
}
