import os
import json
from flask import Flask, request, jsonify, render_template, Response
import google.generativeai as genai
from dotenv import load_dotenv
import pypdf
import nltk                                # NOVO: Importa NLTK
from nltk.corpus import stopwords          # NOVO: Para Stop Words
from nltk.stem import RSLPStemmer          # NOVO: Para Stemming em Português
import re 

# Lógica de importação para suportar o ambiente serverless (Vercel)
try:
    from database import initialize_db, insert_classification, get_history, get_raw_history_data
    from export import export_history_to_csv 
except ImportError as e:
    # Cria funções de placeholder se os módulos não forem encontrados, garantindo que o Flask inicie.
    print(f"ATENÇÃO: Falha ao importar módulos customizados: {e}")
    def initialize_db(): pass
    def insert_classification(*args, **kwargs): pass
    def get_history(): return []
    def get_raw_history_data(): return []
    def export_history_to_csv(data): return Response("Erro de Módulo", mimetype="text/plain", status=500)


load_dotenv()

NLTK_DATA_DIR = '/tmp/nltk_data'
os.makedirs(NLTK_DATA_DIR, exist_ok=True)
nltk.data.path.append(NLTK_DATA_DIR)

# Tenta fazer o download dos recursos necessários, se não existirem
def setup_nltk_data():
    """Garante que os dados do NLTK necessários para Português estejam em /tmp."""
    try:
        # Tenta carregar os dados
        stopwords.words('portuguese')
        nltk.data.find('tokenizers/punkt')
        nltk.data.find('corpora/rslp')
    except (LookupError, FileNotFoundError):
        print("Baixando dados do NLTK para /tmp...")
        try:
            # Baixa os módulos necessários
            nltk.download('stopwords', download_dir=NLTK_DATA_DIR)
            nltk.download('rslp', download_dir=NLTK_DATA_DIR)
            nltk.download('punkt', download_dir=NLTK_DATA_DIR) 
            print("Download do NLTK concluído.")
        except Exception as e:
            print(f"Erro ao baixar dados do NLTK: {e}")

setup_nltk_data()

# Ajusta o root_path para encontrar as pastas 'templates' e 'static' no diretório pai,
# após mover 'app.py' para a pasta 'src/'.
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
app = Flask(__name__, root_path=project_root)

# Configuração da API do Google Generative AI
try:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        # A chave deve ser configurada via Environment Variables (Vercel) ou arquivo .env (local)
        raise ValueError("A variável de ambiente GEMINI_API_KEY não foi definida.")
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.5-flash-lite')
except Exception as e:
    print(f"Erro ao configurar a API do Google: {e}")
    model = None

# Template do Prompt para o Modelo de IA
PROMPT_TEMPLATE = """
Você deve analisar o e-mail fornecido e retornar um objeto JSON seguindo estritamente a estrutura definida abaixo.

Antes de gerar o JSON, siga estas instruções:
1. Classifique o e-mail como "Produtivo" ou "Improdutivo" com base nas definições:
   - "Produtivo": E-mails que requerem uma ação ou resposta específica (ex.: solicitações, dúvidas, atualizações de casos).
   - "Improdutivo": E-mails que não necessitam de ação (ex.: felicitações, agradecimentos, spam).
2. Preste atenção ao idioma do e-mail e responda na mesma língua, caso venha em inglês, responda em especialmente na parte de "suggested_response".
3. Identifique o tópico principal do e-mail em poucas palavras.
4. Avalie o tom do e-mail como "Positivo", "Negativo" ou "Neutro".
5. Evite fazer suposições não justificadas; baseie-se apenas no conteúdo do e-mail.
6. Seja preciso no "confidence_score" (0.0 a 1.0) refletindo o quão certo você está da classificação.
7. Retorne apenas o JSON, sem qualquer explicação, texto adicional ou formatação diferente.

E-mail para análise:
---
{email_content}
---

O JSON de saída deve ter a seguinte estrutura:
- "classification": A categoria ("Produtivo" ou "Improdutivo").
- "confidence_score": Um número entre 0.0 e 1.0 indicando a confiança na classificação.
- "key_topic": Uma palavra ou frase curta resumindo o tópico principal do e-mail (ex.: "Solicitação de Pagamento", "Felicitação").
- "sentiment": O tom predominante do e-mail ("Positivo", "Negativo" ou "Neutro").
- "suggested_response": 
    - Se "Produtivo", sugira uma resposta curta e profissional abordando a solicitação ou dúvida.
    - Se "Improdutivo", sugira uma resposta curta e cordial de agradecimento (ex.: "Obrigado pela informação!").

Retorne apenas o JSON, sem nenhum texto, markdown ou explicação adicional.
"""

def preprocess_text_nlp(text):
    """
    Executa Limpeza, Tokenização, Remoção de Stop Words e Stemming (RSLP) em Português.
    """
    # 1. Limpeza básica (converter para minúsculas e remover pontuação)
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s]', '', text) 

    # 2. Tokenização
    tokens = nltk.word_tokenize(text, language='portuguese')

    # 3. Remoção de Stop Words
    stop_words = set(stopwords.words('portuguese'))
    # Filtra tokens que não estão na lista de stop words e que não são apenas espaços em branco
    filtered_tokens = [word for word in tokens if word not in stop_words and word.strip()]

    # 4. Stemming (Redução ao radical - RSLP para Português)
    stemmer = RSLPStemmer()
    stemmed_tokens = [stemmer.stem(word) for word in filtered_tokens]
    
    # Retorna o texto pré-processado como uma string, separado por espaço
    return ' '.join(stemmed_tokens)

@app.route('/')
def index():
    """Renderiza a página inicial e garante a inicialização do DB (necessário no Serverless)."""
    initialize_db()
    return render_template('index.html')

@app.route('/classify', methods=['POST'])
def classify_email():
    """Recebe o e-mail (texto) ou a lista de arquivos, classifica com a IA, salva e retorna os resultados."""
    initialize_db()
    
    if not model:
        return jsonify({'error': 'O modelo de IA não foi inicializado. Verifique a chave da API.'}), 503

    files_to_process = []
    
    # 1. Extrai o conteúdo do formulário de texto
    if 'email_text' in request.form and request.form['email_text']:
        email_content = request.form['email_text']
        if email_content.strip():
            files_to_process.append({'content': email_content, 'filename': 'Texto Colado'})
    
    # 2. Pega a lista de arquivos (usando 'files[]' como nome do campo)
    uploaded_files = request.files.getlist('files[]')
    
    # 3. Processa e extrai o conteúdo de cada arquivo
    for file in uploaded_files:
        if file.filename == '':
            continue
            
        file_content = ""
        filename = file.filename
        
        if filename.endswith('.txt'):
            try:
                file_content = file.read().decode('utf-8')
            except UnicodeDecodeError:
                files_to_process.append({'error': f'Erro ao decodificar .txt: {filename}'})
                continue
        elif filename.endswith('.pdf'):
            try:
                # O processamento de PDF pode ser lento e falhar
                reader = pypdf.PdfReader(file)
                text = "".join(page.extract_text() or "" for page in reader.pages)
                file_content = text.strip()
            except Exception as e:
                print(f"Erro ao processar PDF: {e}")
                files_to_process.append({'error': f'Falha ao processar PDF: {filename}'})
                continue
        else:
            continue

        if file_content.strip():
            files_to_process.append({'content': file_content, 'filename': filename})

    
    if not files_to_process:
        # Se nenhum arquivo/texto válido foi encontrado, retorna 400
        return jsonify({'error': 'Nenhum conteúdo válido de e-mail fornecido para análise (texto ou arquivo).'}), 400

    
    # 4. Processa cada item (texto ou arquivo) com o modelo Gemini
    all_results = []
    for item in files_to_process:
        if 'error' in item:
            all_results.append(item)
            continue
            
        email_content = item['content']
        filename = item['filename']
        
        try:
            prompt = PROMPT_TEMPLATE.format(email_content=email_content)
            response = model.generate_content(prompt)

            cleaned_response = response.text.strip().replace('```json', '').replace('```', '')

            try:
                result_json = json.loads(cleaned_response)
            except json.JSONDecodeError:
                print(f"Erro ao decodificar JSON. Resposta da IA: {cleaned_response}")
                all_results.append({'error': f'A resposta da IA não estava em um formato JSON válido para: {filename}'})
                continue

            # Extrai e valida dados
            classification = result_json.get("classification", "Desconhecido")
            confidence_score = result_json.get("confidence_score", 0.0)
            suggested_response = result_json.get("suggested_response", "Nenhuma resposta")
            
            # CORREÇÃO: Extrai os novos campos do JSON da IA (caindo para N/A se faltar)
            key_topic = result_json.get("key_topic", "N/A")
            sentiment = result_json.get("sentiment", "N/A")
            
            # Garante que confidence_score seja um float
            if not isinstance(confidence_score, (int, float)):
                try:
                    confidence_score = float(confidence_score)
                except ValueError:
                    confidence_score = 0.0 
                    
            # Salva no histórico
            insert_classification(classification, confidence_score, key_topic, sentiment, suggested_response, email_content)
            
            # Adiciona o resultado à lista
            result_json['source_filename'] = filename
            all_results.append(result_json)


        except genai.types.generation_types.StopCandidateException as e:
            print(f"Geração interrompida pela IA: {e}")
            all_results.append({'error': f"A IA interrompeu a geração por razões de segurança ou conteúdo: {filename}"})
        except Exception as e:
            print(f"Ocorreu um erro inesperado: {e}")
            all_results.append({'error': f"Ocorreu um erro inesperado no servidor para: {filename}"})

    # 5. Retorna a lista de resultados (ou o objeto único se for apenas um)
    if len(all_results) == 1 and 'source_filename' in all_results[0]:
        # Se for apenas um item (texto ou 1 arquivo), retorna o objeto único para não quebrar a exibição atual
        return jsonify(all_results[0])
    
    # Retorna a lista completa de resultados (para o front-end processar)
    return jsonify(all_results)

@app.route('/history')
def history():
    """Retorna os últimos e-mails classificados."""
    initialize_db()
    
    history_data = get_history()
    
    # Processa os dados para adicionar o snippet para o frontend
    processed_history = []
    for row in history_data:
        email_content = row.get('email_content', '')
        # Os campos key_topic e sentiment já são recuperados pela função get_history
        
        snippet = email_content.strip().replace('\n', ' ')[:150] + '...' if len(email_content.strip()) > 150 else email_content.strip().replace('\n', ' ')
        
        processed_history.append({
            'classification': row.get('classification', 'Desconhecido'),
            'created_at': row.get('created_at', ''),
            'email_snippet': snippet,
            'email_content': email_content,
            'suggested_response': row.get('suggested_response', 'Nenhuma resposta')
        })
        
    return jsonify(processed_history)

@app.route('/export_history')
def export_history():
    """Exporta todo o histórico do banco de dados para um arquivo CSV."""
    initialize_db()
    
    try:
        raw_data = get_raw_history_data()
        return export_history_to_csv(raw_data)
        
    except Exception as e:
        print(f"Erro ao exportar histórico: {e}")
        return jsonify({'error': 'Falha ao gerar o arquivo CSV.'}), 500

@app.route('/dashboard')
def dashboard():
    """Renderiza a página do dashboard."""
    return render_template('dashboard.html')

@app.route('/dashboard/data')
def dashboard_data():
    """Fornece os dados do histórico em formato JSON para o dashboard."""
    initialize_db()
    
    # get_raw_history_data() já busca todos os dados que precisamos
    history_data = get_raw_history_data() 
    
    return jsonify(history_data)

if __name__ == '__main__':
    # Bloco para execução local
    initialize_db() 
    app.run(debug=True)