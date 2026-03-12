---
title: "USO DA DLT TANGLE PARA PROTEÇÃO DE DADOS"
date: "Dez 10, 2020"
---

# USO DA DLT TANGLE PARA PROTEÇÃO DE DADOS
*Por José Carlos Pineli, da Unisul - 10/12/2020*

O termo IoT – Internet das Coisas engloba diversas tecnologias e protocolos. Sua principal característica é a comunicação entre dispositivos para envio de dados coletados via sensores. As estimativas falam em bilhões de equipamentos conectados, ultrapassando a quantidade de pessoas no mundo. Por muito tempo, o símbolo de poder e dinheiro era a descoberta e posterior extração de petróleo. Hoje, as empresas petrolíferas estão perdendo valor de mercado para companhias de tecnologia, capazes de transformar dados em informações.

A inteligência analítica gera muita riqueza e está mudando o cenário econômico mundial, fazendo com que dados sejam até mais valiosos do que petróleo. A analogia ilustra sua importância, bem como a capacidade analítica das empresas de tecnologia. Não por acaso, a lista de homens mais ricos e companhias mais valiosas do mundo está ligada a esse segmento.

Por outro lado, o mau uso dos dados é uma preocupação constante. Um exemplo é o Facebook, que perdeu bilhões de dólares por conta do escândalo com a Cambridge Analytica, empresa que comprou indevidamente dados da rede social para favorecimento eleitoral nos EUA, conseguindo assim prever as intenções de voto.

Apesar do amparo da lei, somente a proteção jurídica não é suficiente para evitar a exposição dos dados e indivíduos. Uma das ferramentas que podem auxiliar é DLT – Distributed Ledger Technology ou livro razão distribuído, tecnologia capaz de garantir confidencialidade, integridade e disponibilidade dos dados aos seus titulares.

## IoT e Segurança da Informação

Com o mundo cada vez mais conectado via IoT – Internet das Coisas, crescem as preocupações com segurança e privacidade das transações. A DLT – Distributed Ledger Technology aparece como forma de proteger os dados.

A IoT tem suas raízes antes mesmo da própria Internet com a RFID – Radio Frequency Identification, utilizada na Segunda Guerra Mundial para identificar aviões. Desde então, as tecnologias foram evoluindo por meio do MIT – Massachusetts Institute of Technology, através de um centro de estudos sobre o assunto criado em 1990 nos Estados Unidos. O local também foi palco da primeira utilização do termo IoT, em uma entrevista do pesquisador Kevin Ashton para a revista Forbes.

Descrita como “um grande problema do século XXI”, a segurança da informação é o principal desafio. No contexto da IoT, os desafios para garantir a segurança nos dispositivos estão em todos os pilares de proteção da informação, como autenticação, autorização, privacidade, integridade dos dados e confidencialidade. Uma das normas que visa estabelecer padrões e diretrizes é a ISO 27001 (ou NBR ISO/IEC 27001 no Brasil), focada na melhoria contínua.

## DLTs e Blockchain

A tecnologia de livro-razão distribuída DLT - Distributed Ledger Technology é similar a um banco de dados imutável. A rede utiliza a comunicação ponto a ponto P2P - Peer to Peer e dispensa agentes reguladores. Já a segurança é garantida por meio de um algoritmo.

Blockchain é o mais popular das DLTs por seu uso na criptomoeda bitcoin. Consiste em uma cadeia de blocos de hashes criptográficos onde o segundo bloco depende do hash do primeiro e assim por diante, criando uma corrente que torna os dados imutáveis. O processo de "consensar" e gerar o hash (prova de trabalho ou mineração) exige muito processamento e energia elétrica.

## Tangle x Blockchain

Diferentemente do blockchain, o Tangle utiliza um gráfico acíclico direcionado **DAG – Directed Acyclic Graph**, processo evolutivo para microtransações entre dispositivos IoT. A rede Tangle soluciona problemas de tempo e de taxas nas transações, sendo escalável e exigindo baixo processamento computacional.

As validações no Tangle utilizam o algoritmo **MCMC – Markov Chain Monte Carlo**, que usa duas transações anteriores aleatórias para validar a nova transação. Quanto maior o volume de transações, mais rápidas serão as validações. O consenso é feito para desencorajar spam, e visando longo prazo, o Tangle inclui nativamente resistência à computação quântica.

O Tangle conta também com o protocolo **MAM - Masked Authenticated Messaging**. Trata-se de uma segunda camada que oferece fluxos com canais e mensagens criptografadas via árvore Merkle. As mensagens podem ser:
- **Públicas:** visíveis por todos na rede.
- **Privadas:** disponíveis apenas para quem as criou e detém a chave-raiz.
- **Restritas:** dependem da raiz e de uma chave de autorização revogável.

O MAM garante integridade e privacidade sobre a imutabilidade do livro-razão, ideal para armazenamento de saúde médica e outras redes sensíveis.

## Proteção de Dados IoT

Fabricantes frequentemente não dão a devida importância à proteção em IoT. Senhas fracas em cassinos, termostatos invadidos para contato direto com a vítima e até ataques de ransomware a usinas nucleares são exemplos clássicos. Modelos de negócio IoT que não consideram segurança desde o *design* devem ser fortemente questionados.

A DLT Tangle mostra-se atrativa computacionalmente frente às demais. Na literatura, ela obteve nível satisfatório de segurança em cenários até mesmo onde fraudadores possuem poder de processamento comparável ao da própria rede [1].

Dentre os inúmeros e promissores usos dessa união, surgem *marketplaces* descentralizados, como a iniciativa pioneira da **IOTA** em 2017 [2] (a criptomoeda por trás do Tangle), além de prontuários médicos e aplicações industriais. O ecossistema tende a mudar a forma como utilizamos os dados, construindo uma verdadeira *"Economia das Coisas"*.

> Artigo originalmente publicado na  [Revista RTI - Redes, Telecom e Instalações (Janeiro 2021)](https://www.arandanet.com.br/assets/revistas/rti/2021/janeiro/index.php). Este texto é um Trabalho de Conclusão do Curso de Pós-Graduação em Internet das Coisas da Unisul. Orientador: Prof. Mauro Faccioni Filho. Santa Catarina, 2020. 

---

### Referências
[1] Martinez, Guilherme Gouveia; Rodrigues, Carlo Kleber da Silva. Blockchain and Tangle: The Transaction Security in the IoT Ecosystem. Revista de Sistemas e Computação, 2020.
[2] Harbor, Cara. Iota. Parte 1: Iota Data Marketplace. Disponível em: https://bit.ly/2K7HmHE.
