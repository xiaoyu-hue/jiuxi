---
year: 2022
title: OpenAI 发布 Whisper 大规模语音识别
category: "模型"
source: Radford et al., OpenAI（arXiv:2212.04356）
sourceUrl: https://arxiv.org/abs/2212.04356
---

2022 年 9 月 OpenAI 发布 **Whisper**：用 68 万小时弱监督多语种语音数据预训练，得到一个接近「听写级」准确率、覆盖近百种语言的语音识别模型，且开源可本地部署。

Whisper 把「语音」正式纳入大模型时代的基础能力栈：它是后续语音助手、会议转写、字幕、实时翻译的产品基座，也是多模态模型「能听」的前提。其「弱监督大规模预训练 + 零样本迁移」的思路，与同期 NLP 的 GPT 路线（见 GPT-3 2020）一脉相承。

> 交叉引用：语音是通往「全模态」的一环（见 CLIP 2021 的「能看」、GPT-4V 2023 的「图文」）；2026 年 OpenAI 又推出全双工语音模型 GPT-Live（见 2026-07），把 Whisper 式的识别升级为自然对话。
