package com.example.calculadora.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class ProductDTO {

    private Long id;
    private String name;
    private String code;
    private String category;
    private BigDecimal cost;
    private BigDecimal profitPercentage;
    private boolean exemptFromVAT;
    private String photoUrl;
    private LocalDateTime updatedAt;
    // Calculated fields
    private BigDecimal priceWithoutVAT;
    private BigDecimal priceWithVAT;
    private BigDecimal utility;

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public BigDecimal getCost() {
        return cost;
    }

    public void setCost(BigDecimal cost) {
        this.cost = cost;
    }

    public BigDecimal getProfitPercentage() {
        return profitPercentage;
    }

    public void setProfitPercentage(BigDecimal profitPercentage) {
        this.profitPercentage = profitPercentage;
    }

    public boolean isExemptFromVAT() {
        return exemptFromVAT;
    }

    public void setExemptFromVAT(boolean exemptFromVAT) {
        this.exemptFromVAT = exemptFromVAT;
    }

    public String getPhotoUrl() {
        return photoUrl;
    }

    public void setPhotoUrl(String photoUrl) {
        this.photoUrl = photoUrl;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public BigDecimal getPriceWithoutVAT() {
        return priceWithoutVAT;
    }

    public void setPriceWithoutVAT(BigDecimal priceWithoutVAT) {
        this.priceWithoutVAT = priceWithoutVAT;
    }

    public BigDecimal getPriceWithVAT() {
        return priceWithVAT;
    }

    public void setPriceWithVAT(BigDecimal priceWithVAT) {
        this.priceWithVAT = priceWithVAT;
    }

    public BigDecimal getUtility() {
        return utility;
    }

    public void setUtility(BigDecimal utility) {
        this.utility = utility;
    }
}