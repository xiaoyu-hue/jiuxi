---
year: 2021
title: "Switch Transformer：把 MoE 推到万亿参数"
category: 理论
source: "Switch Transformers: Scaling to Trillion Parameter Models"
sourceUrl: https://arxiv.org/abs/2101.03961
---

Fedus 等人（Google）用稀疏 MoE 把模型扩到万亿参数，却只激活其中一小部分，验证了「参数规模」与「单次推理算力」可解耦。它与 Shazeer 的 MoE 理论（2017）一脉相承，为 DeepSeek、Mixtral、Qwen-MoE 等**高效巨模型路线**提供实证蓝图。
