# 📧 Analisador de E-mails com IA (Gemini)

Uma aplicação web inteligente construída com **Flask** e **Google Gemini** para classificar e-mails, extrair insights e sugerir respostas automaticamente, otimizando a triagem e a produtividade de equipes.

**🔗 Link para a aplicação:** [**Acesse a demonstração aqui!**](https://autou-five.vercel.app/)  

![Demonstração da Interface](./static/assets/demo.gif)


---

## ✨ Funcionalidades Principais

| Funcionalidade | Descrição |
| :--- | :--- |
| **🤖 Classificação Inteligente** | Utiliza o modelo `gemini-pro` do Google para classificar e-mails como **"Produtivo"** ou **"Improdutivo"** com alta precisão. |
| **📝 Análise Completa** | Além da classificação, a IA extrai o **tópico principal**, o **sentimento** (Positivo, Negativo, Neutro) e sugere uma **resposta automática**. |
| **📂 Múltiplos Formatos** | Analise e-mails colando o texto diretamente ou fazendo o upload de múltiplos arquivos `.txt` e `.pdf` de uma só vez. |
| **🗂️ Histórico de Análises** | Exibe um histórico interativo das análises, com comportamento adaptado ao ambiente (local vs. online). |
| **📊 Dashboard Dinâmico** | Apresenta gráficos e métricas sobre as análises, também com dados adaptados ao ambiente. |
| **📄 Exportação para CSV** | Exporte o histórico completo do banco de dados para um arquivo `.csv`, pronto para análise externa. |
| **☁️ Pronto para a Nuvem** | O projeto está configurado para deploy *serverless* na **Vercel**, garantindo escalabilidade e facilidade de manutenção. |

---

## 🛠️ Tecnologias Utilizadas

* **Backend:** Python, Flask
* **Inteligência Artificial:** Google Gemini API
* **Frontend:** HTML5, CSS3, JavaScript
* **Banco de Dados:** SQLite
* **Processamento de Arquivos:** PyPDF
* **Deploy:** Vercel

---

## 🚀 Como Executar o Projeto Localmente

Siga os passos abaixo para ter o projeto rodando na sua máquina.

#### **Pré-requisitos**

* Python 3.8+
* pip (gerenciador de pacotes)
* Uma **chave de API do Google Gemini**. Você pode obter uma gratuitamente no [Google AI Studio](https://aistudio.google.com/).

#### **Passos para Instalação**

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/viniciusdiller/AutoU
    cd AutoU
    ```

2.  **Crie e ative um ambiente virtual:**
    ```bash
    # Windows
    python -m venv venv
    .\venv\Scripts\activate

    # macOS/Linux
    python3 -m venv venv
    source venv/bin/activate
    ```

3.  **Instale as dependências:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Configure a sua chave de API:**
    Crie um arquivo chamado `.env` na raiz do projeto e adicione sua chave de API:
    ```.env
    GEMINI_API_KEY="SUA_CHAVE_DE_API_AQUI"
    ```

5.  **Execute a aplicação:**
    ```bash
    # A partir da raiz do projeto
    flask run
    ```

6.  **Acesse no navegador:**
    Abra seu navegador e acesse `http://127.0.0.1:5000`.

---

## ⚠️ Nota sobre a Persistência do Histórico

A aplicação possui um **comportamento duplo inteligente** para lidar com o histórico de análises, dependendo do ambiente em que é executada.

#### **Ambiente Local**
Ao rodar na sua máquina, o histórico e o dashboard são lidos diretamente do banco de dados **SQLite (`emails.db`)**. Isso garante que os dados são **totalmente persistentes** e refletem todas as análises já realizadas.

#### **Ambiente Online (Vercel)**
Na versão hospedada na Vercel, o sistema de arquivos do servidor é temporário. Para contornar isso e oferecer uma experiência persistente para o usuário, a aplicação salva o histórico de análises e os dados do dashboard no **armazenamento local do navegador** (`LocalStorage`, similar a um "cache" ou "cookie" avançado).

**O que isso significa na prática?**
* **Vantagem:** Seu histórico pessoal fica salvo no seu navegador, mesmo que você feche a aba e volte mais tarde.
* **Inconsistência:** O histórico online pode ser considerado "inconstante" por dois motivos:
    1.  Ele é **pessoal e local para cada navegador**. O histórico que você vê no seu computador não aparecerá no seu celular.
    2.  Ele será **perdido** se você limpar os dados de navegação (cache, cookies, etc.) do seu navegador.

A funcionalidade de **Exportar (CSV)** sempre utilizará os dados do banco de dados do servidor. Portanto, na Vercel, ela exportará apenas as análises feitas na sessão ativa do servidor.



