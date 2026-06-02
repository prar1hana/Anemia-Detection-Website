# # =========================================================
# # model.py
# # =========================================================

# import torch
# import torch.nn as nn
# from torchvision import models
# from torchvision.models import (
#     ConvNeXt_Base_Weights,
#     EfficientNet_B3_Weights
# )


# class RBCEnsembleClassifier(nn.Module):

#     def __init__(
#         self,
#         num_classes=12,
#         morph_dim=6
#     ):
#         super().__init__()

#         # -------------------------------------------------
#         # ConvNeXt
#         # -------------------------------------------------

#         self.convnext = models.convnext_base(
#             weights=ConvNeXt_Base_Weights.DEFAULT
#         )

#         conv_feat_dim = (
#             self.convnext.classifier[2]
#             .in_features
#         )

#         self.convnext.classifier = nn.Identity()

#         self.convnext_pool = nn.AdaptiveAvgPool2d(
#             (1, 1)
#         )

#         # -------------------------------------------------
#         # EfficientNet
#         # -------------------------------------------------

#         self.effnet = models.efficientnet_b3(
#             weights=EfficientNet_B3_Weights.DEFAULT
#         )

#         eff_feat_dim = (
#             self.effnet.classifier[1]
#             .in_features
#         )

#         self.effnet.classifier = nn.Identity()

#         # -------------------------------------------------
#         # Final FC
#         # -------------------------------------------------

#         self.fc = nn.Sequential(

#             nn.Linear(
#                 conv_feat_dim +
#                 eff_feat_dim +
#                 morph_dim,
#                 512
#             ),

#             nn.BatchNorm1d(512),

#             nn.ReLU(),

#             nn.Dropout(0.4),

#             nn.Linear(
#                 512,
#                 num_classes
#             )
#         )

#     def forward(
#         self,
#         x,
#         morph
#     ):

#         # ---------------------------------------------
#         # ConvNeXt features
#         # ---------------------------------------------

#         c_feats = self.convnext(x)

#         c_feats = self.convnext_pool(
#             c_feats
#         )

#         c_feats = c_feats.view(
#             c_feats.size(0),
#             -1
#         )

#         # ---------------------------------------------
#         # EfficientNet features
#         # ---------------------------------------------

#         e_feats = self.effnet(x)

#         # ---------------------------------------------
#         # Combine
#         # ---------------------------------------------

#         combined = torch.cat(
#             [
#                 c_feats,
#                 e_feats,
#                 morph
#             ],
#             dim=1
#         )

#         return self.fc(combined)