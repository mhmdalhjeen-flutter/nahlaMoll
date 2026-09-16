import { describe, expect, it } from 'vitest';
import {
  buildFreeDeliveryJourneyView,
  canShowSecondaryActions,
  getProgressBarColorClass,
  getVisualStage,
} from './free-delivery-journey';

describe('free-delivery-journey', () => {
  describe('getVisualStage', () => {
    it('returns none at 0%', () => {
      expect(getVisualStage(0, false)).toBe('none');
    });

    it('returns green when achieved', () => {
      expect(getVisualStage(96, true)).toBe('green');
    });

    it('returns yellow for 1-49', () => {
      expect(getVisualStage(1, false)).toBe('yellow');
      expect(getVisualStage(25, false)).toBe('yellow');
      expect(getVisualStage(49.99, false)).toBe('yellow');
    });

    it('returns blue for 50-79', () => {
      expect(getVisualStage(50, false)).toBe('blue');
      expect(getVisualStage(60, false)).toBe('blue');
      expect(getVisualStage(79.99, false)).toBe('blue');
    });

    it('returns orange for 80-94', () => {
      expect(getVisualStage(80, false)).toBe('orange');
      expect(getVisualStage(85, false)).toBe('orange');
      expect(getVisualStage(94.99, false)).toBe('orange');
    });

    it('returns green at 95+ threshold', () => {
      expect(getVisualStage(95, false)).toBe('green');
      expect(getVisualStage(100, false)).toBe('green');
    });
  });

  describe('getProgressBarColorClass', () => {
    it('maps stages to solid semantic fill classes', () => {
      expect(getProgressBarColorClass('none')).toBe('bg-transparent');
      expect(getProgressBarColorClass('yellow')).toBe('bg-primary-400');
      expect(getProgressBarColorClass('blue')).toBe('bg-navy-500');
      expect(getProgressBarColorClass('orange')).toBe('bg-primary-600');
      expect(getProgressBarColorClass('green')).toBe('bg-success-600');
    });
  });

  describe('canShowSecondaryActions', () => {
    it('hides secondary actions at 0% with empty cart', () => {
      expect(canShowSecondaryActions(0, false)).toBe(false);
    });

    it('shows secondary actions when progress started', () => {
      expect(canShowSecondaryActions(25, false)).toBe(true);
    });

    it('shows secondary actions when cart has items even at 0%', () => {
      expect(canShowSecondaryActions(0, true)).toBe(true);
    });
  });

  describe('buildFreeDeliveryJourneyView', () => {
    it('hides secondary actions in first-time empty 0% state', () => {
      const view = buildFreeDeliveryJourneyView({
        isAuthenticated: false,
        pct: 0,
        achieved: false,
        hasExplained: false,
        isEmptyCart: true,
        highProgressNotFree: false,
        hasCartItems: false,
      });
      expect(view.showFirstTimeCTA).toBe(false);
      expect(view.showHowLink).toBe(false);
      expect(view.showAreasLink).toBe(false);
      expect(view.visualStage).toBe('none');
      expect(view.headline).toContain('اشتري');
    });

    it('shows secondary actions at 25% progress', () => {
      const view = buildFreeDeliveryJourneyView({
        isAuthenticated: true,
        pct: 25,
        achieved: false,
        hasExplained: true,
        isEmptyCart: false,
        highProgressNotFree: false,
        hasCartItems: true,
      });
      expect(view.visualStage).toBe('yellow');
      expect(view.showAreasLink).toBe(true);
      expect(view.showHowLink).toBe(true);
    });

    it('shows free delivery achieved at 95+', () => {
      const view = buildFreeDeliveryJourneyView({
        isAuthenticated: true,
        pct: 96,
        achieved: true,
        hasExplained: true,
        isEmptyCart: false,
        highProgressNotFree: false,
        hasCartItems: true,
      });
      expect(view.visualStage).toBe('green');
      expect(view.headline).toContain('التوصيل علينا');
      expect(view.headline).not.toContain('باقي لك');
      expect(view.showCheckoutCTA).toBe(true);
    });

    it('uses orange stage at 85%', () => {
      const view = buildFreeDeliveryJourneyView({
        isAuthenticated: true,
        pct: 85,
        achieved: false,
        hasExplained: true,
        isEmptyCart: false,
        highProgressNotFree: false,
        hasCartItems: true,
      });
      expect(view.visualStage).toBe('orange');
    });

    it('uses blue stage at 60%', () => {
      const view = buildFreeDeliveryJourneyView({
        isAuthenticated: true,
        pct: 60,
        achieved: false,
        hasExplained: true,
        isEmptyCart: false,
        highProgressNotFree: false,
        hasCartItems: true,
      });
      expect(view.visualStage).toBe('blue');
    });

    it('does not claim free delivery when area ineligible', () => {
      const view = buildFreeDeliveryJourneyView({
        isAuthenticated: true,
        pct: 98,
        achieved: false,
        hasExplained: true,
        isEmptyCart: false,
        highProgressNotFree: true,
        hasCartItems: true,
      });
      expect(view.subline).toContain('غير متاح');
    });

    it('uses direct progress messaging without banned phrases', () => {
      const view = buildFreeDeliveryJourneyView({
        isAuthenticated: true,
        pct: 35,
        achieved: false,
        hasExplained: true,
        isEmptyCart: false,
        highProgressNotFree: false,
        hasCartItems: true,
      });
      expect(view.headline).toContain('35%');
      expect(view.headline).not.toContain('أنت الآن قريب');
      expect(view.progressLabel).not.toContain('تقدم التوصيل');
    });
  });
});
